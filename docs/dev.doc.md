## 1. data-scope

> 通过调用 access/data-permission resolveForUser 计算得到，要么远程调用远程调用 await dataPermissionService.resolveForUser(...)，要么 inject DataPermissionService，如果业务系统和 IAM 架构一致也是放到 apps 或者采用 monorepo 时可选注入服务方式，但分别部署时更多采用 HTTP

方案 A：
业务 API 放在 IAM 里（BFF / 同进程）
任务 API 如果写在 IAM 的 ApplicationRuntimeController 里，可以直接注入服务，不需要 HTTP：

```
// IAM 内部（NestJS）— 伪代码
@Get('tasks')
@UseGuards(OidcBearerGuard, ApplicationUserGuard, PermissionsGuard)
@RequirePermissions('flow_admin:tasks:view')
async listTasks(@Req() req: AuthedRequest) {
  const userId = req.user.id; // OidcBearerGuard 从 token 注入

  const dataScope = await this.dataPermissionService.resolveForUser(
    userId,
    'flow_admin:tasks',
  );

  const qb = this.taskRepo.createQueryBuilder('task');
  applyDataScope(qb, dataScope, userId);

  return qb.getMany();
}

function applyDataScope(qb, scope, userId) {
  switch (scope.scope) {
    case 'self':
      qb.andWhere('task.ownerId = :userId', { userId });
      break;
    case 'dept':
    case 'dept_and_child':
      qb.andWhere('task.departmentId IN (:...ids)', {
        ids: scope.departmentIds?.length ? scope.departmentIds : ['__none__'],
      });
      break;
    case 'all':
      break;
  }
}
```

方案 B：express 伪代码
···
// flow_admin/server.js（独立业务后端，假设跑在 :4000）

const express = require('express');
const IAM_BASE = 'https://iam.example.com';
const APP_ID = '01KWEVEXEC0EY4W4A3RC5QCAGZ';
const TASK_RESOURCE = 'flow_admin:tasks';

const app = express();

/\*_ 1. 鉴权：验证 OIDC access_token，拿到 userId _/
async function authMiddleware(req, res, next) {
const auth = req.headers.authorization;
if (!auth?.startsWith('Bearer ')) {
return res.status(401).json({ message: '缺少 token' });
}
req.accessToken = auth.slice(7);

// 方式 A：调 IAM userinfo（你们已有 /oidc/me）
const uiRes = await fetch(`${IAM_BASE}/oidc/me`, {
headers: { Authorization: `Bearer ${req.accessToken}` },
});
if (!uiRes.ok) return res.status(401).json({ message: 'token 无效' });
const userinfo = await uiRes.json();
req.userId = userinfo.sub; // OIDC sub = IAM userId
next();
}

/\*_ 2. 向 IAM 拉 data scope（需新增端点） _/
async function fetchDataScope(accessToken, resource, applicationId) {
const url = new URL(`${IAM_BASE}/api/me/data-scope`);
url.searchParams.set('resource', resource);
url.searchParams.set('applicationId', applicationId);

const res = await fetch(url, {
headers: { Authorization: `Bearer ${accessToken}` },
});
const json = await res.json();
if (!res.ok) throw new Error(json.message || '获取 data scope 失败');
return json.data ?? json; // IAM 统一响应 { code, data, message }
}

/\*_ 3. 把 scope 转成 SQL 条件 _/
function applyTaskDataScope(queryBuilder, scope, userId) {
switch (scope.scope) {
case 'self':
return queryBuilder.where('owner_id = ?', [userId]);
case 'dept':
case 'dept_and_child':
const ids = scope.departmentIds ?? [];
if (ids.length === 0) {
// 无管辖部门 → 看不到任何数据（比 all 更安全）
return queryBuilder.where('1 = 0');
}
return queryBuilder.whereIn('department_id', ids);
case 'all':
return queryBuilder;
default:
return queryBuilder.where('owner_id = ?', [userId]); // 未知 scope 保守降级
}
}

/\*_ 4. 业务接口 _/
app.get('/tasks', authMiddleware, async (req, res) => {
try {
// 可选：先调 IAM 验功能权限（或本地缓存 permission codes）
// GET /api/me/permissions?applicationId=... 检查含 flow_admin:tasks:view

    const dataScope = await fetchDataScope(
      req.accessToken,
      TASK_RESOURCE,
      APP_ID,
    );

    let query = db('tasks').select('*');
    query = applyTaskDataScope(query, dataScope, req.userId);
    const tasks = await query;

    res.json({ items: tasks, dataScope }); // dataScope 可只在 debug 时返回

} catch (e) {
res.status(500).json({ message: e.message });
}
});
···

可选优化（生产常见）
缓存 scope：同一请求链只调一次 IAM；短 TTL Redis 缓存 userId + resource → scope（角色变更时要失效）。
Token 里带 scope claims：登录时写入 JWT，减少每次 HTTP；但改角色后要等 token 过期或强制刷新。
Service-to-service：Express 用 client_credentials 调 IAM 内部 API（适合无用户 token 的后台任务）。

注意：在业务系统创建数据时，明确数据可见范围，如果数据有 data permission 就要做冗余字段设计 比如 该数据的 owner_id department_id 或者 creator_id assignee_department_id assignee_user_id 等 以便后期查找使用

设计阶段先回答：「谁、在什么组织关系下、因为什么理由能看到这条数据？」

用户能看多大范围？IAM data_permission → resolveForUser （all、self、dept）
范围对应业务表哪几列？flow_admin 自己定义（scope → SQL 映射） 设计阶段必须想清楚
创建/指派时写哪些值？flow_admin 写入逻辑

设计时可用的检查清单
新建一张「会被列表/查询接口暴露」的表时，问 4 个问题：

这个 resource 在 IAM 里配了 data_permission 吗？

没有 → 可能只需功能权限（RBAC），不必想 scope 字段
有 → 继续下面 3 问
self 在业务里指什么？

我创建的？我负责的？指派给我的？
→ 决定 filter 用 creator_id 还是 assignee_user_id 或 OR 组合
dept 在业务里指什么？

执行部门？创建部门？归属部门？
→ 决定 filter 用哪个 \*\_department_id
创建时要写哪些值？

从 token 拿 creator*id
从表单拿 assignee*\*
必要时调 IAM getUserOrgContext 做校验，但不要把创建人部门误当成任务部门

历史归属（换部门后旧任务算哪个部门）更难处理
所以：不是必须冗余，但协作型业务几乎总要显式存「执行方/归属方」维度，否则 dept/self 都会对不上。

在设计表时，如果当前表需要做 data permission, 也就是说当前的 resource 在 IAM 里配置了 data_permission 那么就需要做冗余字段 department_id 设计，因为创建数据的人可能因为多年后部门调整导致数据更难处理，所以在创建数据的当下就要明确创建数据的人属于哪个部门，明确归属方和执行方

怎么减轻心智负担（工程化）
每个 resource 写一份 scope 映射文档（你 dev.doc 正在做的）

```
flow_admin:tasks
- self  → creator_id = user OR assignee_user_id = user
- dept  → assignee_department_id IN departmentIds
- all   → 无过滤
```

封装 applyXxxDataScope(qb, scope, userId)
业务代码只调一个函数，不散落 if/else。

创建 DTO + Service 统一赋值

```
createTask(dto, currentUserId) {
  return {
    creatorId: currentUserId,
    assigneeUserId: dto.assigneeUserId,
    assigneeDepartmentId: dto.assigneeDepartmentId, // 来自表单，不是 creator 的部门
  };
}
```

IAM 的 resource 粒度按「会被独立控权的业务对象」划分
如 flow_admin:tasks、flow_admin:materials，不要一张大表一个 scope 硬套所有场景。
