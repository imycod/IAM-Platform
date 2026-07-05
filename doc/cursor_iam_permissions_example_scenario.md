# IAM permissions example scenario
_Exported on 7/5/2026 at 14:45:22 GMT+8 from Cursor (3.1.15)_

---

**User**

有了这套IAM 权限数据管理以及身份认证系统，足以支撑中等300多号人左右的公司团队了吧？你给我举一个例子，我做验证，比如 一个人在某部门担任某职位，干了2年被调到了另外的部门担任另外职位，那么这个人曾经管理和创建的数据这样 举一个例子我拿这个系统测一测

---

**Cursor**

我先梳理这套 IAM 在组织、职位与数据权限上的设计，再据此给你一个可操作的调岗验证场景。


**结论先说：可以。** 300 人左右的团队，在「多应用 SSO + RBAC 功能权限 + 组织树 + 数据权限 + 业务系统接入（flow-admin）」这套架构下是够用的。规模上主要是 MySQL、Redis、IAM 实例数量的问题，不是模型能力的问题。

下面给你一个**可直接照着测**的完整例子，专门验证「调岗 2 年后，历史数据怎么办」。

---

## 核心机制（测之前先理解）

这套系统对「调岗后历史数据」的处理逻辑是：

| 维度 | 调岗后是否变化 | 说明 |
|------|----------------|------|
| `employee.department_id` | **会变** | 调岗 = 更新员工档案 |
| 业务数据的 `creator_id` | **不变** | 创建时写入，永久绑定创建人 |
| 业务数据的 `dept_id` | **不变** | 创建时按**当时**所在部门快照写入 |
| 数据权限过滤 | **按当前角色 + 当前部门实时算** | 不会自动把历史数据的 `dept_id` 改掉 |

创建产品时就是这样打标的：

```55:66:d:\code\iam-platform\flow-admin\backend\src\modules\product\product.service.ts
  async create(dto: CreateProductDto, userId: string, org?: { organizationId?: string | null; departmentId?: string | null }) {
    const entity = this.repo.create({
      id: generateId(),
      name: dto.name.trim(),
      mainImage: dto.mainImage?.trim() || null,
      primaryResourceId: dto.primaryResourceId || null,
      creatorId: userId,
      updaterId: userId,
      organizationId: org?.organizationId ?? null,
      departmentId: org?.departmentId ?? null
    });
    return this.repo.save(entity);
  }
```

数据权限范围有 5 档：`self` / `dept` / `dept_and_child` / `all` / `custom`。  
`dept` 类权限看的是**当前**部门（以及是否部门负责人），不是历史部门：

```55:77:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\organization\services\organization-query.service.ts
  async getAccessibleDepartmentIds(userId: string, includeSubtree: boolean): Promise<string[]> {
    const emp = await this.employeeRepo.findOne({ where: { userId } });
    if (!emp?.departmentId) {
      return this.getManagedDepartmentIds(userId);
    }

    const ids = new Set<string>(await this.getManagedDepartmentIds(userId));
    ids.add(emp.departmentId);
    // ... includeSubtree 时再加子部门
```

---

## 测试剧本：李明，市场部 → 产品部

### 人物与组织

```
默认组织
├── 市场部 (dept_marketing)
│   └── 李明 — 市场专员（2024.01 入职）
└── 产品部 (dept_product)
    └── （2026.07 调岗过来）— 产品经理
```

再建两个对照用户：
- **王芳**：市场部同事（同部门、同权限）
- **赵总**：管理员（`all` 数据权限）

---

### 第一步：IAM 里搭组织和人

在 **iam-admin** 里：

1. **组织** → 确认有「默认组织」
2. **部门** → 新建「市场部」「产品部」（可挂在「总部」下）
3. **岗位** → 新建「市场专员」「产品经理」
4. **用户** → 创建 `liming@company.com`（李明）、`wangfang@company.com`（王芳）
5. **员工** → 把李明、王芳都挂到「市场部 + 市场专员」
6. **应用授权** → 两人都能登录 `flow-admin`

---

### 第二步：配角色和数据权限（关键）

在 IAM 里给 flow-admin 配两个角色（示例）：

| 角色 | 功能权限 | 数据权限 resource | scope |
|------|----------|-------------------|-------|
| `flow_admin:marketing_staff` | 产品增删改查 | `flow_admin:products` | **`dept`** |
| `flow_admin:product_manager` | 产品增删改查 | `flow_admin:products` | **`self`** |
| `flow_admin:admin` | 全部 | `flow_admin:products` | **`all`** |

分配：
- 李明、王芳 → `marketing_staff`（部门可见）
- 赵总 → `admin`

> 产品资源的数据字段映射是：`self` → `creator_id`，`dept` → `dept_id`（见 `field-mappings.ts`）。

---

### 第三阶段：李明在市场部工作 2 年（模拟）

用 **李明的 token** 登录 `flow.iam.local`，在 **产品列表** 创建：

| 产品名 | 预期写入 |
|--------|----------|
| 2024春季推广方案 | `creator_id=李明`, `dept_id=市场部` |
| 2025品牌手册 | `creator_id=李明`, `dept_id=市场部` |

**验证点 A — 列表可见性**

| 登录人 | 产品列表应看到 |
|--------|----------------|
| 李明 | 市场部全部产品（含王芳建的 + 自己建的） |
| 王芳 | 同上（同 dept scope） |
| 赵总 | 全部 |

**验证点 B — 数据库快照**（可选）

```sql
SELECT name, creator_id, dept_id FROM flow.flow_products
WHERE name LIKE '202%';
```

确认 `dept_id` 是市场部 ID，不是产品部。

---

### 第四阶段：2026.07 调岗（核心测试）

在 **iam-admin → 员工管理**：

1. 编辑李明员工档案  
   - 部门：市场部 → **产品部**  
   - 岗位：市场专员 → **产品经理**
2. 角色：`marketing_staff` → **`product_manager`**（`dept` 改 `self`）

> 注意：系统**没有**调岗历史表，`employee` 是直接覆盖更新，不会保留「曾在市场部 2 年」这条记录。这是当前设计的边界。

---

### 第五阶段：调岗后的预期结果（重点）

#### 1. 李明登录 flow-admin 看产品列表

| 产品 | 能否看到 | 原因 |
|------|----------|------|
| 2024春季推广方案 | **能** | `self`：`creator_id = 李明` |
| 2025品牌手册 | **能** | 同上 |
| 王芳在市场部建的产品 | **不能** | 不是李明创建的，且已不是 `dept` 权限 |
| 产品部同事新建的产品 | **不能** | 不是李明创建的 |

#### 2. 王芳（仍留市场部）登录

| 产品 | 能否看到 |
|------|----------|
| 李明的两个历史产品 | **能** | 仍在市场部 `dept_id` 下 |
| 李明调岗后在产品部新建的产品 | **不能** | 新数据 `dept_id=产品部` |

#### 3. 李明在产品部新建产品

| 产品名 | 预期 |
|--------|------|
| 2026Q3产品路线图 | `creator_id=李明`, `dept_id=**产品部**`（新部门快照） |

李明能看到：自己全部历史 + 这条新产品。  
王芳看不到这条新产品。

---

## 用 API 做精确验证（可选）

调岗前后各调一次 IAM 数据权限接口：

```http
GET /api/me/data-filters?resource=flow_admin:products
Authorization: Bearer <李明的 access_token>
```

**调岗前（dept）** 大致返回：

```json
{
  "scope": "dept",
  "filters": [
    { "field": "organization_id", "operator": "=", "value": "..." },
    { "field": "dept_id", "operator": "=", "value": "<市场部ID>" }
  ]
}
```

**调岗后（self）** 大致返回：

```json
{
  "scope": "self",
  "filters": [
    { "field": "organization_id", "operator": "=", "value": "..." },
    { "field": "creator_id", "operator": "=", "value": "<李明userId>" }
  ]
}
```

再调 flow-admin：

```http
GET /api/products
Authorization: Bearer <李明的 token>
```

对比调岗前后返回条数，应和上面表格一致。

---

## 进阶场景（测系统边界）

### 场景 1：调岗后仍要管整个新部门

角色改为 `dept` 或 `dept_and_child`，且部门负责人设为李明（`department.leader_employee_id`）。

- **能看到**：产品部（及子部门）全部数据  
- **看不到**：市场部历史数据（除非 `creator_id=自己` 且角色有多条规则 OR 并集）

多角色时系统是 **OR 并集**，例如同时有 `self` + `dept`，调岗后 =「自己创建的全部历史」∪「新部门全部数据」。

### 场景 2：调岗后历史数据要交给继任者

**当前系统不会自动做。** 需要业务侧手动：
- 改 `flow_products.dept_id`，或
- 改 `creator_id` / 增加 `owner_id`，或
- 走审批/交接流程（需你们自己开发）

IAM 只负责「谁能查」，不负责「数据归属迁移」。

### 场景 3：经理调岗后还想看老部门数据

需要：
- 保留额外角色（如「市场部只读」+ custom 表达式），或
- 用 `custom` scope，例如：`creator_id = me OR dept_id = 原部门`（需 IAM Admin 配 custom_expr）

---

## 300 人公司还缺什么（诚实说）

| 已有 | 300 人通常还需要（可后续加） |
|------|------------------------------|
| SSO / 多应用 | 企业微信 / LDAP / AD 同步 |
| 组织树 + 岗位 | 调岗/任职**历史记录** |
| RBAC + 数据权限 | 审批流（入转调离） |
| flow-admin 示范接入 | 更多业务系统按同样 pattern 接入 |
| 登录审计 | 更完整的数据变更审计 |

---

## 推荐你按这个顺序测

1. 搭组织 + 2 个部门 + 3 个用户  
2. 配 `dept` 和 `self` 两种数据权限  
3. 李明在市场部建 2 条产品 → 确认部门可见  
4. 调岗 + 换角色 → 确认「历史自建仍可见、原部门同事数据不可见」  
5. 在产品部再建 1 条 → 确认新 `dept_id` 是产品部  
6. 用王芳、赵总账号交叉验证  

如果你愿意，我可以再给你一份「IAM Admin 里每个菜单点哪里、字段填什么」的逐步操作清单，或者帮你设计「经理调岗 + 多角色 OR 并集」的第二套测试用例。

---

**User**

都调到产品部了 是看不到 市场部的数据吧 尽管自己创建的也看不到了

---

**Cursor**

**取决于调岗后给的角色数据权限 scope，不是「调到产品部」这件事本身。**

---

## 纯 `dept` / `dept_and_child`：看不到市场部数据，包括自己建的

调岗后如果角色数据权限仍是 **`dept` 或 `dept_and_child`**（只是部门从市场部换成产品部），列表过滤大致是：

```text
dept_id IN (当前可访问部门)   ← 调岗后 = 产品部
```

历史产品创建时打的是 **`dept_id = 市场部`**，这个字段**不会**随调岗更新。  
所以：

| 数据 | 能否看到 |
|------|----------|
| 王芳在市场部建的产品 | 看不到 |
| **李明自己在市场部建的产品** | **也看不到** |
| 产品部其他人的产品 | 能看到（同 dept） |
| 调岗后在产品部新建的产品 | 能看到 |

也就是说：**调到产品部 + 仍是部门级权限 → 市场部数据全部不可见，含自己创建的。** 你的理解在这种配置下是对的。

---

## 换成 `self`：自己建的仍能看到

如果调岗后角色改成 **`self`**，过滤变成：

```text
creator_id = 当前用户
```

这时：

- 市场部时期自己建的产品 → **仍能看到**（看 creator，不看 dept）
- 王芳建的市场部产品 → 看不到
- 产品部同事的产品 → 看不到（除非也是你建的）

---

## 多角色 OR 并集：两种都能看到

若同时有例如：

- 角色 A：`self`（看自己创建的）
- 角色 B：`dept`（看产品部）

系统是 **OR 并集**，调岗后 ≈「自己创建的全部历史」∪「产品部全部数据」。  
市场部同事的数据仍看不到，但**自己以前在市场部建的**会回来。

---

## 小结

| 调岗后数据权限 | 市场部历史（含自建） | 产品部数据 |
|----------------|----------------------|------------|
| 仅 `dept` / `dept_and_child` | **看不到** | 能看到 |
| 仅 `self` | **自建能看到** | 仅自建能看到 |
| `self` + `dept`（多角色） | **自建能看到** | 部门内都能看到 |
| `all` | 全部能看到 | 全部能看到 |

---

## 业务上常见做法

若希望「调岗后仍能看到自己历史数据，但看不到原部门其他人数据」：

1. 用 **`self`**（或 `self` + 新部门 `dept` 组合）  
2. 或用 **`custom`**，例如：`creator_id = me OR dept_id = 产品部`  
3. 若要把历史数据正式交给继任者，需业务侧改 `dept_id` / 负责人，IAM 不会自动迁移

你测「调到产品部后市场部数据全不可见」时，把李明角色设成 **纯 `dept`** 即可验证；若设成 **`self`**，预期会不同。

---

**User**

数据范围的全部 是不是跨 org 组织的？

---

**Cursor**

正在确认 `all` 数据范围在代码里是否会叠加组织过滤。


**是的。在当前实现里，`all`（全部）数据范围不会按组织过滤，等价于跨 org 可见该资源下的全部业务数据。**

---

## 代码依据

`all` 会返回 `unrestricted: true`，且不带任何 filter：

```59:61:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\access\data-permission\services\data-permission-filter.resolver.ts
    if (scopeResult.scope === DataScope.ALL) {
      return { ...base, unrestricted: true, filters: [] };
    }
```

其他 scope（`self` / `dept` / `custom` 等）会**额外**加上当前员工所在组织的条件；但 `all` 会跳过这一步：

```197:208:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\access\data-permission\services\data-permission-filter.resolver.ts
    if (
      orgContext?.organizationId &&
      mapping.orgField &&
      !resolved.unrestricted &&
      !resolved.denyAll
    ) {
      resolved.filters.unshift({
        field: mapping.orgField,
        operator: '=',
        value: orgContext.organizationId,
      });
    }
```

flow-admin 侧收到 `unrestricted=true` 后，**不再追加任何 WHERE**：

```136:138:d:\code\iam-platform\flow-admin\packages\shared\src\data-permission\apply-filters.ts
  if (!permission || permission.unrestricted) {
    return qb;
  }
```

所以：赵总这类 `scope=all` 的用户查 `flow_products`，会看到**所有 org** 的产品，不只是自己组织。

---

## 和其他 scope 的对比

| 数据范围 | 是否限制 org | 实际效果 |
|----------|--------------|----------|
| `self` | **是** | 本 org 内 + 仅自己创建/负责 |
| `dept` / `dept_and_child` | **是** | 本 org 内 + 当前部门范围 |
| `custom` | **是** | 本 org 内 + 自定义条件 |
| **`all`** | **否** | **整张业务表，跨 org** |

---

## 需要注意的几点

1. **`all` 应只给极少数超级管理员**  
   seed 里 `flow_admin:manager` 就是 `scope=all`，适合平台/系统管理员，不适合普通业务角色。

2. **「跨 org」指同一套业务库里的数据**  
   如果 A 公司、B 公司共用同一个 `flow` 库，且 `organization_id` 不同，`all` 会把两家数据都查出来。若将来按租户拆库，隔离在基础设施层，不在 IAM 这一层。

3. **创建数据时仍会打 org 标签**  
   即使某人有 `all` 读权限，新建产品时仍会写入**当前员工档案**的 `organization_id` / `dept_id`（来自 `getUserOrgContext`）。`all` 只影响「查」，不影响「写时打标」。

4. **多 org 员工档案**  
   一个 User 可以在多个 org 各有一条 employee（唯一约束是 `organization_id + user_id`）。但 `getUserOrgContext` 用的是 `findOne({ userId })`，若同一人挂多个 org，取哪条并不明确——这主要影响**写入时的 org 上下文**，不影响 `all` 的读取范围。

---

## 实际建议

- **单公司 300 人**：通常只有 1 个 org，`all` ≈ 看全公司数据，问题不大。  
- **多子公司 / 多租户**：普通角色用 `dept` / `self`，**不要**随便给 `all`；跨 org 管理应单独设计「集团管理员」角色并严格控制人数。

若要验证：建两个 org 的数据，用 `scope=all` 的用户登录 flow-admin 产品列表，应能看到两个 org 的产品；换成 `dept` 用户则只能看到本 org 本部门数据。

---

**User**

我发现一个问题，当一个账户既是A系统的iam_admin:manager 也是B系统 flow-admin 的 flow_admin:manager 时  如果 flow_admin:manager分配的是 本部及子部门 而 iam_admin:manager 分配的是 all 那么 在flow-admin 登陆后  即便 当前的roles 查出来 只有flow_admin:manager 其iam_admin:manager 数据权限 也会生效

---

**Cursor**

这像是跨应用角色未隔离导致的数据权限泄漏。我先查 IAM 解析数据权限时是否按 `application_id` 过滤角色。


**你的判断是对的，这是 IAM 侧的一个设计缺陷，不是 flow-admin 的问题。**

---

## 现象确认

在 flow-admin 登录时：

- **功能权限 / 角色列表**：只显示 `flow_admin:manager`（按 `applicationId` 过滤了）
- **数据权限**：却把 `iam_admin:manager` 的规则也算进来了，最终变成 `all`

所以你看到「角色只有 flow 的 manager，数据却是全部」——符合当前代码行为。

---

## 根因：两套 API 行为不一致

### 功能权限（正确）——按应用隔离

```182:186:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\access\permission\services\permission.service.ts
  async resolveUserPermissionCodes(userId: string, applicationId?: string): Promise<string[]> {
    const userRoles = await this.userRoleRepo.find({ where: { userId } });
    const roleIds = userRoles
      .filter((ur) => !applicationId || !ur.applicationId || ur.applicationId === applicationId)
      .map((ur) => ur.roleId);
```

`/api/me/permissions?applicationId=flow-admin` 只会用**当前应用**下的角色。

### 数据权限（有 bug）——未按应用隔离

Controller 虽然传了 `applicationId`，但只用来校验「能否访问该应用」，**没有传给解析逻辑**：

```58:71:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\access\user-context\user-context.controller.ts
  @Get('data-filters')
  async dataFilters(
    @Req() req: AuthedRequest,
    @Query('resource') resource: string,
    @Query('applicationId') applicationId?: string,
  ) {
    // ...
    await this.applicationService.assertUserCanAccess(applicationId, req.user.id);
    return this.dataPermissionService.resolveFiltersForUser(req.user.id, resource.trim());
  }
```

`resolveForUser` 会拉取该用户的**全部角色**，再合并所有角色的数据权限：

```132:146:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\access\data-permission\services\data-permission.service.ts
  async resolveForUser(userId: string, resource: string): Promise<ResolvedDataScope> {
    const userRoles = await this.userRoleRepo.find({ where: { userId } });
    const roleIds = userRoles.map((ur) => ur.roleId);
    // ...
    const rows = await this.repo.find({ where: { roleId: In(roleIds), resource } });
    // ...
    if (rows.some((row) => row.scope === DataScope.ALL)) {
      return { scope: DataScope.ALL };
    }
```

只要**任意一个角色**对同一 `resource` 配了 `all`，就直接返回 `unrestricted: true`，其它角色的 `dept_and_child` 被完全覆盖。

---

## 你的场景里具体怎么泄漏的

数据库里确实存在这种配置：`iam_admin:manager` 角色上挂了 `flow_admin:products` 等资源，且 scope 为 `all`：

```text
role: iam_admin:manager (01KWHPXE31Y3B02J3NMN2A1SAN)
  → flow_admin:products  scope=all
  → flow_admin:materials scope=all
  → flow_admin:tasks     scope=all
```

flow-admin 请求：

```http
GET /api/me/data-filters?resource=flow_admin:products&applicationId=<flow-admin>
```

实际计算过程：

```text
user_role  → [flow_admin:manager, iam_admin:manager]   ← 两个都进来
data_permission WHERE resource=flow_admin:products
  → flow_admin:manager  → dept_and_child
  → iam_admin:manager   → all          ← 命中 all，直接 unrestricted
```

最终 flow-admin 列表**不加任何 WHERE**，等于看全表。

---

## 为什么「查 roles 只有 flow_admin:manager」但数据权限仍泄漏

| 能力 | 是否按 applicationId 过滤角色 |
|------|------------------------------|
| 角色 / 功能权限 | 是 |
| 数据权限 | **否** |

所以 UI 上角色看起来正常，数据权限却跨应用「串台」了。

---

## 修复方向（需在 Agent 模式改代码）

`resolveForUser` / `resolveFiltersForUser` 应增加 `applicationId` 参数，与功能权限对齐：

```typescript
// 伪代码
async resolveForUser(userId: string, resource: string, applicationId?: string) {
  const userRoles = await this.userRoleRepo.find({ where: { userId } });
  const roleIds = userRoles
    .filter((ur) => !applicationId || !ur.applicationId || ur.applicationId === applicationId)
    .map((ur) => ur.roleId);
  // 后续逻辑不变...
}
```

Controller 改为：

```typescript
return this.dataPermissionService.resolveFiltersForUser(
  req.user.id,
  resource.trim(),
  applicationId,  // 传下去
);
```

更严谨的做法还可以二次校验：`role.applicationId === applicationId`，避免 `user_role.applicationId` 为空时误匹配平台级角色。

---

## 临时规避（不改代码）

1. **删掉** `iam_admin:manager` 上不该有的 `flow_admin:*` 数据权限行（IAM 管理员一般只需 `iam_admin:*` 资源）
2. 或把 `iam_admin:manager` 的 flow 相关数据权限从 `all` 改成更窄的 scope
3. 尽量别让同一人同时挂两个应用的 manager；平台管理员用独立账号

---

## 小结

| 问题 | 结论 |
|------|------|
| 是 bug 吗？ | **是**，数据权限未按应用隔离 |
| flow-admin 有问题吗？ | 没有，它正确传了 `applicationId` |
| 为何 `all` 盖过 `dept_and_child`？ | 多角色合并时，任一角色 `all` 即短路为全量 |
| 正确行为应是？ | flow-admin 只应看 `flow_admin:manager` 的数据权限 |

需要我直接在代码里修这个隔离问题的话，切换到 **Agent 模式** 即可。

---

**User**

修复

---

**Cursor**

正在修复数据权限未按 `applicationId` 隔离的问题，先定位所有相关调用点。


正在实现：在 `resolveForUser` 中按 `applicationId` 过滤角色，与功能权限逻辑对齐。


已修复。数据权限解析现在与功能权限一样，会按 `applicationId` 隔离角色。

## 改动说明

**1. `data-permission.service.ts`**
- `resolveForUser` / `resolveFiltersForUser` 增加可选参数 `applicationId`
- 新增 `resolveRoleIdsForUser`：
  - 先按 `user_role.applicationId` 过滤（与 `PermissionService.resolveUserPermissionCodes` 一致）
  - 再按 `role.applicationId` 过滤，避免 `user_role.applicationId` 为空时跨应用串权

**2. `user-context.controller.ts`**
- `/api/me/data-filters` 和 `/api/me/data-scope` 将 `applicationId` 传入解析逻辑

## 修复后的行为

在 flow-admin 请求 `data-filters?applicationId=<flow-admin>&resource=flow_admin:products` 时：

- 只统计 **flow-admin 应用下** 的 `user_role` / `role`
- `iam_admin:manager` 的 `scope=all` **不再参与** flow-admin 的数据权限计算
- 最终应得到 `flow_admin:manager` 配置的 `dept_and_child`（或你实际配置的范围）

## 验证方式

1. 重启 IAM 服务（若 flow-admin 有 data-filters 缓存，等约 60s 或重启 flow-admin backend）
2. 用同时挂两个 manager 的账号登录 flow-admin
3. 调接口或看产品列表，应只受 `flow_admin:manager` 数据权限约束

```http
GET /api/me/data-filters?resource=flow_admin:products&applicationId=<flow-admin-app-id>
Authorization: Bearer <token>
```

预期：`unrestricted: false`，`scope` 为 `dept_and_child`（或你配置的值），不再是 `all`。

---

**User**

然后，还有个问题，把org也加上去，不同的组织创建的数据，只能给这个组织下的人，不同的部门看到，然后你告诉我在哪里改 我后面可能 会撤销， 这个修改后 是不是就可以变成 SAAS 或者 租户的模式了？

---

**Cursor**

先梳理当前 org 隔离在数据权限链路上的实现位置，再说明要改哪里以及是否足以支撑 SaaS/租户模式。


**先说结论：org 隔离你们已经做了一半。** `self` / `dept` / `dept_and_child` / `custom` 在查列表时会自动加 `organization_id = 当前员工所在组织`；真正漏的是 **`all` 会跳过 org 过滤**，以及业务侧若干接口没走数据权限。把 org 做成硬边界后，可以支撑 **「共享库 + 多 org 软隔离」** 的 SaaS/租户模式，但还不是完整 SaaS 平台。

---

## 当前已经有什么

### 1. 读列表：非 `all` 时已经按 org 过滤

IAM 解析 filters 时，会在非 `all` 情况下追加 org 条件：

```197:208:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\access\data-permission\services\data-permission-filter.resolver.ts
    if (
      orgContext?.organizationId &&
      mapping.orgField &&
      !resolved.unrestricted &&
      !resolved.denyAll
    ) {
      resolved.filters.unshift({
        field: mapping.orgField,
        operator: '=',
        value: orgContext.organizationId,
      });
    }
```

字段映射里 `flow_admin:products` 等已配置 `orgField: 'organization_id'`：

```5:9:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\access\data-permission\utils\resource-field-mapping.ts
  'flow_admin:products': {
    selfFields: ['creator_id'],
    deptField: 'dept_id',
    orgField: 'organization_id',
  },
```

效果：`dept` 实际是 **本 org 且本部门**；`self` 是 **本 org 且本人创建**。

### 2. 写数据：创建时已打 org 标签

flow-admin 创建产品时会写入 `organization_id` / `dept_id`（来自员工档案）。

---

## 还缺什么（你要补的 org 硬隔离）

| 问题 | 现状 | 影响 |
|------|------|------|
| `all` 跳过 org | `unrestricted=true` 不加任何 WHERE | A 公司管理员可能看到 B 公司数据 |
| 多 org 员工 | `getUserOrgContext` 用 `findOne({ userId })` | 一人多 org 时 org 上下文不确定 |
| 详情/改/删 | `findOne` / `update` / `delete` 未校验数据权限 | 知道 ID 可跨 org 操作 |
| 下拉接口 | `listOptions()` 无过滤 | 任务选产品可能看到别的 org |
| 无员工档案的用户 | `orgContext` 为 null | 不会加 org 过滤，可能看到更多 |

---

## 要改哪里（方便你以后撤销）

建议按层改，每层独立、可回滚。

### 第一层（核心，IAM）— 让 org 成为租户硬边界

**文件：** `IAM-Platform/apps/iam/src/modules/access/data-permission/services/data-permission-filter.resolver.ts`

**改法 A（推荐）：`all` 改为「本 org 内全部」**

- 在 `resolveSingle` 里：`scope === ALL` 时不再返回 `unrestricted: true`
- 改为：`filters: [{ field: orgField, operator: '=', value: orgContext.organizationId }]`（无 org 则 `denyAll`）
- 同时删掉或调整上面 197–208 行「仅非 unrestricted 才加 org」的分支，避免重复

**改法 B（更激进）：任何 scope 都强制 org**

- 去掉 `!resolved.unrestricted` 条件，连 `all` 也叠加 org（与 A 类似）

撤销时：恢复 `ALL → unrestricted: true` 和原 org 条件即可。

---

### 第二层（IAM）— 多 org 用户取对组织

**文件：** `IAM-Platform/apps/iam/src/modules/organization/services/organization-query.service.ts`

```25:34:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\organization\services\organization-query.service.ts
  async getUserOrgContext(userId: string): Promise<UserOrgContext | null> {
    const emp = await this.employeeRepo.findOne({ where: { userId } });
```

**改法：**

- 方法签名加 `organizationId?: string`
- 有参数时：`findOne({ userId, organizationId })`
- 从 `/api/me/data-filters` 传入当前应用的 org（或 token / header 里的 `X-Organization-Id`）

**连带改：**

- `data-permission-filter.resolver.ts` → `resolveWithOrgContext`
- `user-context.controller.ts` → 传 org 上下文

---

### 第三层（业务 flow-admin）— 写入与漏口

| 文件 | 改什么 |
|------|--------|
| `flow-admin/backend/src/modules/product/product.controller.ts` | `findOne` / `update` / `delete` 走数据权限；`listOptions` 加 org + 权限过滤 |
| `flow-admin/backend/src/modules/task/...` | 同上 |
| `flow-admin/backend/src/modules/material/...` | 同上 |
| `flow-admin/packages/shared/src/data-permission/field-mappings.ts` | 新资源补 `orgField`（与 IAM 侧 mapping 对齐） |
| `IAM-Platform/.../resource-field-mapping.ts` | 同上，IAM 侧 |

实体层 `organization_id` 列已有，一般不用改表结构。

---

### 第四层（可选）— 登录时选租户

完整 SaaS 通常还需要：

- 登录后选 org，或域名/subdomain 绑定 org
- JWT / session 带 `organizationId`
- `application_user` 是否按 org 授权（当前主要是按应用，不是按 org）

这会在 **iam-login / portal / OIDC claims** 侧改，范围更大，可第二阶段做。

---

## 改完后的数据可见性（示意）

假设 Org-A、Org-B 各有一套部门：

```
Org-A / 市场部 → 只能看 Org-A + 市场部（dept）
Org-A / 产品部 → 只能看 Org-A + 产品部
Org-A / 管理员(all) → 看 Org-A 全部，看不到 Org-B
平台超管（若保留真·all）→ 需单独设计，不走普通 all
```

部门隔离仍靠 `dept_id`；org 是更外层的租户墙。

---

## 这样算不算 SaaS / 租户模式？

**部分算。** 更准确的说法：

| 能力 | 改 org 硬隔离后 | 完整 SaaS 还需要 |
|------|----------------|------------------|
| 多 org 数据隔离（共享库） | 可以 | — |
| 同 org 内部门/角色权限 | 已有 | — |
| 跨 org 绝不串数据 | 需修 `all` + 漏口 API | — |
| 一人多 org 切换 | 需 org 上下文 | 登录选租户 |
| 按 org 开户/计费/配额 | 无 | 商业化模块 |
| 按 org 独立库 | 无 | 硬隔离 / 分库 |
| org 级应用授权 | 弱 | `application_user` 扩展 |

所以：**改完后 = 软多租户（shared database, org_id 隔离）**，适合「一个平台服务多家公司，各看各的数据」。不是 AWS 级全栈 SaaS，但对 300 人公司、多子公司已经够用。

---

## 建议实施顺序（方便逐步验证、逐步撤销）

1. 只改 `data-permission-filter.resolver.ts`：`all` → org 内全部（影响最大、改动最小）
2. 改 `organization-query.service.ts`：多 org 上下文
3. 补 flow-admin 的 `findOne` / `update` / `delete` / `listOptions` 权限
4. 再做登录选 org（若真要多租户运营）

---

## 如何验证

1. 建 Org-A、Org-B，各建员工和产品（带不同 `organization_id`）
2. Org-A 用户 `dept` → 只见 Org-A 本部门
3. Org-A 用户 `all` → 见 Org-A 全部，**不见** Org-B
4. 直接访问 `GET /products/:id`（B 的 ID）→ 应 403/404

如果你要动手改，切到 **Agent 模式** 我可以按「只改第一层 + 第三层漏口」做一版最小 diff，方便你随时 git revert。

---

**User**

你帮我按照推荐的改，然后留个后门 可以在 IAM 管理平台上 登陆 iam_admin:manager 给对应角色配置 unrestricted 则可以跨org 查看（和现在功能一样）， unrestricted 配置可默认 false ，然后就走按推荐的 让org 成为租户边界

---

**Cursor**

先梳理数据权限实体、解析逻辑和 IAM Admin 配置界面，再实现 org 租户边界与可配置的 `unrestricted` 跨 org 后门。


已实现 org 租户边界，并加上可配置的 `unrestricted` 跨组织后门。

## 行为说明

| scope | unrestricted | 效果 |
|-------|--------------|------|
| `all` | **false（默认）** | 仅当前组织内全部（自动加 `organization_id = 员工所在组织`） |
| `all` | **true** | 与旧版一致，跨 org 全量（`unrestricted: true`，不加 org 过滤） |
| `self` / `dept` / … | 忽略 | 仍叠加 org 边界（有员工档案时） |

## 改动文件

1. **数据库** — `migrations/1783000000005-AddDataPermissionUnrestricted.ts`（已执行）
2. **实体/DTO** — `data-permission.entity.ts`、`data-permission.dto.ts`
3. **解析逻辑** — `data-permission.service.ts`、`data-permission-filter.resolver.ts`
4. **契约** — `libs/contracts/.../data-permission.contract.ts`
5. **IAM Admin UI** — 数据权限表单在 scope=`全部` 时显示「跨组织」开关

## 如何使用后门

1. 登录 **iam-admin**，进入 **访问控制 → 数据权限**
2. 编辑 `iam_admin:manager`（或其他平台角色）对应资源的规则
3. 数据范围选 **全部**，打开 **跨组织 unrestricted**
4. 保存后该角色恢复跨 org 可见；其他角色默认仍只能看本 org

## 重要提示

- **已有 `scope=all` 的数据权限** migration 后 `unrestricted=0`，会变成「本 org 内全部」，不再跨 org。平台管理员需在 IAM Admin 里手动打开 unrestricted。
- 用户**无员工档案**且 scope=all（未开 unrestricted）→ `denyAll`（看不到数据）。
- 需**重启 IAM 服务**；flow-admin 的 data-filters 缓存约 60s，或重启 flow-admin backend。

## 撤销方式

- 回滚 migration：`pnpm migration:revert`
- 或只恢复 `data-permission-filter.resolver.ts` 里 ALL 的处理逻辑

---

**User**

第二层和第四层能兼容现在的阶段吗？我觉得现在阶段就挺好，但是我又想要加上租户，登陆时让用户选择当前处于哪个租户，那么登进去就是这个租户返回的所有数据，这是明确的，如果用户没选租户走default 默认 那么 就是 现在的状态明确（而且还有后门），如果走了租户那么后门就不管用了，如果第四层那么是 前端l3个login iam-admin login.vue 和 iam-login html 和 flow-admin login 都需要在登陆下面加 选择下拉框 选择租户， 然后 改动大吗？ 如果按你说的 第四层 和 第三层也都要一起是吧？如果选择了 是 token 在解析时也要一并解析 teantId 是把？ 能兼容吗？ 我不太懂这些。 这个是不是还是要看业务怎么定义，如果一个公司多个组织 也是这样可以的 要跨组织下 部门这样定义吧， 或者一个租户 下 多个组织 多个 部门 也是可以定义的对吧？ 尽量按照大型架构来 可以兼容这样

---

**Cursor**

先梳理当前登录、Token 与组织模型，再说明第二层/第四层如何与现有阶段兼容。


**可以兼容。** 你现在的阶段不用推翻重来；第二层、第四层可以分步加，而且和你说的「默认 = 现状 + 后门，选了租户 = 严格隔离、后门失效」完全对得上。

下面按「能不能兼容 → 改哪里 → 改动大不大 → 大型架构怎么定」说明。

---

## 1. 先对齐概念：你们库里已经有「租户」位置

`organization` 表设计里已经写了：

```128:138:d:\code\iam-platform\IAM-Platform\doc\库表设计.md
## 8. organization 组织 / 租户
...
| type | varchar(20) | default 'company' | tenant / company / branch |
```

也就是说：

| 概念 | 在你们系统里对应什么 |
|------|----------------------|
| **租户（Tenant）** | 通常 `organization.type = tenant` 的顶层组织 |
| **公司/子公司** | `organization` 树（`parent_id`） |
| **部门** | `department` 树（挂在某个 `organization_id` 下） |
| **人在哪** | `employee`（`user_id + organization_id` 唯一，一人可在多个 org 各有一条员工档案） |
| **业务数据归属** | `flow_products.organization_id` + `dept_id` |

所以：**一个租户下多个组织、每个组织多个部门**——模型已经支持，主要是「登录后到底用哪条 employee / 哪个 organization_id」还没定死。

---

## 2. 你提的模式，和现有实现怎么兼容

你想要的两档行为：

```
登录未选租户（default）
  → 保持现在：getUserOrgContext 随便取一条 employee + unrestricted 后门可跨 org

登录选了租户 T
  → 整站上下文固定为 T
  → 所有数据权限强制 organization_id = T
  → unrestricted 后门不生效（即使角色配了跨组织）
```

这和你们刚做的第一层（org 租户边界 + `unrestricted` 开关）**是叠加关系，不是替换**：

| 场景 | 数据权限行为 |
|------|-------------|
| 未选租户 + scope=all + unrestricted=false | 按**当前 employee 的 org** 过滤（和现在类似，但 employee 取哪条仍不明确） |
| 未选租户 + scope=all + unrestricted=true | 跨 org 全量（后门） |
| **已选租户 T** + 任意 scope | **强制 `organization_id = T`**，忽略 unrestricted |
| 已选租户 + dept/self | 在 T 内再按部门/本人收窄 |

**结论：完全兼容。** 默认路径不动；只有「用户显式选了租户」才走严格模式。

---

## 3. 第二层、第四层分别是什么，现在要不要上

### 第二层（IAM：`getUserOrgContext` 传明确 org）

**作用：** 解决现在 `findOne({ userId })` 一人多 org 时取哪条不确定的问题。

```25:27:d:\code\iam-platform\IAM-Platform\apps\iam\src\modules\organization\services\organization-query.service.ts
  async getUserOrgContext(userId: string): Promise<UserOrgContext | null> {
    const emp = await this.employeeRepo.findOne({ where: { userId } });
```

**兼容方式：**

```typescript
getUserOrgContext(userId, organizationId?: string)
// 有 organizationId → 精确查 employee
// 没有 → 保持现在 findOne（default 模式）
```

- **现在阶段：** 可以不上，系统照样跑（单 org 公司无感）。
- **要上登录选租户：** 第二层**几乎必须**，否则选了租户后端也不知道用哪条 employee。

**改动量：小～中**（主要是 IAM 内部 + `data-filters` 多传一个 org 参数）。

---

### 第四层（登录页选租户 + token/session 带上下文）

**作用：** 用户登录时选「当前工作在哪个租户/组织」，之后所有 API 都在这个上下文里。

涉及入口：

| 入口 | 说明 |
|------|------|
| `iam-login/index.html` | OIDC 统一登录页，**SSO 最合适只改这一处** |
| `iam-admin/login` | 账密 / SSO /bootstrap |
| `flow-admin/login` | 同上 |

**兼容方式：**

- 下拉框 **可选**，默认「不指定 / 跟随系统」→ 走 default 模式
- 只有选了才写入 session / token

**改动量：**

- **若 mostly SSO（推荐）：** 主要改 **iam-login** + IAM 认证回调，iam-admin / flow-admin 只读 bootstrap 里的 `activeOrganizationId` → **中等**
- **若三个入口都支持账密独立登录：** 三个 login 都要加下拉 + 调「列出我可用的租户/组织」API → **中等偏大**

---

### 第三层（flow-admin 漏口：findOne / update / listOptions）

和「登录选租户」**不是强绑定**，但**要上严格租户时建议一起做**：

- 现在 `GET /products/:id`、`listOptions()` 等**没走数据权限**，知道 ID 可能跨 org 访问
- 只加登录选租户、不修这些接口，仍有越权风险

**改动量：中**（每个 resource 的 controller/service 补一层校验）。

---

## 4. 第三层和第四层要不要一起上？

| 目标 | 建议 |
|------|------|
| 只要「大型架构预留、现在单公司用着挺好」 | **都不急**，维持现状 + 已做的 org/unrestricted 即可 |
| 要「登录选租户，进去数据明确属于该租户」 | **第四层 + 第二层必须一起**；第三层强烈建议一起 |
| 要「完整 SaaS 不能越权」 | 第二 + 第三 + 第四 + 后续 billing/开户 |

**token 里要不要带 tenantId？**

是的，但需要 **服务端校验**，不能只信前端：

```
推荐链路：

登录选 org/T
  → IAM 校验：该 user 是否有 employee(userId, organizationId)
  → 写入：
      方案 A：session 表加 active_organization_id（portal 登录）
      方案 B：OIDC access_token 自定义 claim：organization_id（SSO，业务系统最常用）
  → /api/me/data-filters 解析时：
      有 activeOrganizationId → 强制 org 边界，禁用 unrestricted
      无 → default 模式（现有逻辑）
```

**不是**「JWT 里有个 tenantId 字符串就完事」，而是：

1. 登录时绑定
2. 每次 data-filters / 写数据时校验用户是否属于该 org
3. 业务 API 用 IAM 返回的 filters，或同样读 claim

flow-admin 已经在创建时写 `organization_id`，缺的主要是 **读路径统一用「当前活跃 org」**。

---

## 5. 大型架构：几种常见定义（都能映射到你们模型）

### 模型 A：单公司（你现在 300 人阶段）

```
1 个 organization（默认组织）
  └── 市场部、产品部、研发部...
```

- **不需要登录选租户**
- 现有 + org 边界 + 后门就够用

---

### 模型 B：一个平台，多个独立客户（经典 SaaS）

```
Tenant-A（organization type=tenant）
  └── 部门树...
Tenant-B
  └── 部门树...
```

- 用户可能是 Tenant-A 员工，也可能是平台 `iam_admin:manager`（无 tenant 或 special）
- **登录必须选 Tenant**（或子域名 `tenant-a.app.com` 自动绑定）
- 业务数据 `organization_id = Tenant-A`
- 平台管理员：不选 tenant → default + unrestricted 后门

---

### 模型 C：集团多子公司（一个租户，多个组织）

```
Tenant=集团
  ├── 子公司甲（organization type=company）
  │     └── 研发部、销售部
  └── 子公司乙
        └── ...
```

两种产品决策：

1. **登录选「集团」**：数据权限在集团内跨子公司（要扩展 dept 逻辑或 org 树过滤）
2. **登录选「子公司」**：`organization_id` 固定为子公司，部门在子公司内——**和现有 dept scope 最合拍**

---

### 模型 D：一人兼多个租户

```
User 张三
  ├── employee @ Tenant-A / 市场部
  └── employee @ Tenant-B / 顾问
```

- 登录下拉列出：`Tenant-A`、`Tenant-B`
- 切换租户 = 重新 bootstrap / 换 token claim（类似 Slack 换 workspace）

你们 `employee` 表 `(organization_id, user_id)` 唯一，**已经支持**。

---

## 6. 推荐演进路线（兼容、可回滚）

```
阶段 0（现在）✅
  org 租户边界 + unrestricted 后门 + 应用级 data-permission 隔离

阶段 1（小改，为选租户铺路）
  第二层：getUserOrgContext(userId, organizationId?)
  data-filters 支持 query/header：organizationId（可选）
  → 不传 = 完全等同现在

阶段 2（你要的登录选租户）
  第四层：
    - API：GET /api/me/organizations（用户可用的 tenant/org 列表）
    - iam-login 加可选下拉
    - session / OIDC claim 写入 activeOrganizationId
  数据权限：
    - 有 activeOrganizationId → 强制 org 过滤，unrestricted 无效

阶段 3（安全补全）
  第三层：flow-admin findOne/update/delete/listOptions 走权限

阶段 4（真 SaaS 运营，以后）
  开户、计费、子域名、application_user 按 tenant 授权...
```

每一阶段都可以单独 revert，不破坏上一阶段。

---

## 7. 直接回答你的几个具体问题

**Q：第二层、第四层能兼容现在吗？**  
**A：能。** 不传 org / 不选租户 = 现状；选了才启用严格模式。

**Q：改动大吗？**  
**A：** 阶段 1 小；阶段 2 中等（SSO 集中改 iam-login 会小很多）；阶段 3 中等。不是重写，是在现有链路上加「活跃 org 上下文」。

**Q：第三层也要一起吗？**  
**A：** 严格租户场景**建议一起**；只想要「列表看起来对」可以暂缓，但有 ID 越权风险。

**Q：token 要解析 tenantId 吗？**  
**A：** 要，但更准确是 **`activeOrganizationId`**（和库里 `organization_id` 一致）。放在 OIDC claim 或 session，且服务端校验 employee 归属。

**Q：一个公司多组织 / 一个租户多组织多部门都可以吗？**  
**A：可以。** 靠 `organization` 树 + `department` 树 + 登录时选哪一层作为 `activeOrganizationId` 来定义；这是**业务产品决策**，不是技术做不到。

**Q：是不是要看业务怎么定义？**  
**A：对。** 技术模型已够；你要先定：

1. 「租户」= 顶层 org，还是 = 每个客户公司？  
2. 登录选的是 tenant 还是 subsidiary？  
3. 平台管理员是否永远不选租户、走后门？  

定完这三条，第二层 + 第四层的字段和 UI 就很明确了。

---

如果你下一步要做，我建议从 **阶段 1（第二层，可选 org 参数 + default 不变）** 开始，验证无误再加 **iam-login 一个下拉**；需要我按这个方案改代码时，切到 Agent 模式即可。

---

**User**

为啥 租户等于 顶层 org 还是 每个 客户公司 ？ 这是什么意思， 登陆选 tenant 还是 subsidiary 这又是什么意思 平台管理员是否永远不选租户 走后门 （如果选：那就不走后门）

---

**Cursor**

这三个问题本质上是：**在你们系统里，「租户」这个词到底指哪一层组织、登录时用户选哪一层、以及平台管理员什么时候能跨组织**。下面用具体例子说明。

---

## 1. 「租户 = 顶层 org」还是「每个客户公司」？

在你们库里，`organization` 可以叠成树，且 `type` 可以是 `tenant / company / branch`。  
**「租户」不是数据库自动定的，而是你们产品上要定：隔离边界画在哪一层。**

### 说法 A：租户 = 顶层 org（平台上的一个「账号/空间」）

适合 **SaaS：一个平台服务很多家互不相关的客户**。

```
平台 IAM
├── 租户：阿里（type=tenant）     ← 登录选这个
│     ├── 杭州公司（company）
│     └── 北京公司（branch）
├── 租户：腾讯（type=tenant）
│     └── ...
└── 租户：某创业公司（type=tenant）
      └── 就一个部门
```

- **数据隔离：** `organization_id` 通常指 **租户 id**（阿里、腾讯各自一套数据）
- **含义：** 「租户」= 平台上的一个独立客户空间，账单、权限、数据都按这个空间算

### 说法 B：租户 = 每个客户公司（树里某一层都算「一个客户」）

适合 **一个集团客户只占一个平台账号，但下面有多家子公司**。

```
平台 IAM
└── 集团客户：某某集团（有人把这层叫 tenant）
      ├── 子公司甲（company）  ← 也有人把「每个子公司」叫 tenant
      ├── 子公司乙（company）
      └── 子公司丙（company）
```

这里会混两种叫法：

| 叫法 | 实际指什么 |
|------|------------|
| 租户 = 整个集团 | 一个付费客户，下面多家子公司共享「集团账号」 |
| 租户 = 每个子公司 | 每家子公司当作独立租户，数据按子公司隔离 |

**技术表都是 `organization`，差别只在：你们把哪一层的 `id` 当作 `flow_products.organization_id` 的隔离键。**

### 和「300 人单公司」的关系

你们现在多半是：

```
默认组织（1 个 org）
  └── 市场部、产品部、研发部...
```

这时 **不用纠结 tenant**：整个公司就是一个 org，部门用 `dept` 即可。  
「租户 = 顶层还是客户公司」主要是 **以后要接第二家、第三家客户** 时才需要定规则。

---

## 2. 「登录选 tenant」还是「选 subsidiary」是什么意思？

登录下拉框里列的是 **org 树里的哪一层**，选中的那一层会成为 **本次会话的「当前工作组织」**（`activeOrganizationId`），后面查数据、写数据都按它过滤。

### 选 Tenant（顶层 / 集团）

用户登录选：**「某某集团」**

```
当前上下文 = 集团 id
→ 可能看到：集团下所有子公司的数据（若权限是 all/dept 且规则允许跨子公司）
→ 适合：集团总部管理员
```

### 选 Subsidiary（子公司）

用户登录选：**「子公司甲」**（不是集团）

```
当前上下文 = 子公司甲 id
→ 只能看到 organization_id = 子公司甲 的数据
→ 子公司乙的数据看不到
→ 适合：子公司自己的员工
```

### 和部门的关系

```
登录选：子公司甲          ← 定 org 边界（租户/公司这一层）
进去后：dept 权限         ← 再在甲公司内部按部门收窄
         self 权限         ← 或只看自己创建的
```

**登录选 org ≠ 选部门。**  
登录选的是 **公司/租户这一层**；部门仍是 employee 上的 `department_id` + 数据权限 `dept`。

### 单公司阶段

下拉可以只有一个：**「默认组织」**，或不显示下拉（default 模式）——和现在一样。

---

## 3. 平台管理员：永远不选租户走后门？选了就不走后门？

你的理解 **对**，可以定成下面这条产品规则：

| 登录方式 | 行为 |
|----------|------|
| **不选租户（default）** | 和现在类似；若角色配了 `scope=all` + `unrestricted=true`，可 **跨 org** 看全平台数据（后门） |
| **选了某个租户 T** | 会话绑定 `activeOrganizationId = T`；**强制** `organization_id = T`，**忽略 unrestricted**，后门不生效 |

### 为什么要这样设计？

- **平台运维 / IAM 管理员**：经常要查所有客户 → 登录 **不选租户** → 可走 unrestricted 后门  
- **代客排查某一家客户**：登录 **选「阿里」** → 和该客户管理员看到的一样，避免误看别家数据  
- **普通 SaaS 用户**：登录 **必须选（或只有一个）租户** → 永远在后门之外，最安全  

### 举例

```
武兴师 = iam_admin:manager（unrestricted 已开）+ flow_admin:manager

登录 flow-admin：
  不选租户 → 可看所有 org 的产品（后门）
  选「默认组织」→ 只看默认组织内的产品（和该 org 普通管理员一致）
```

**不是「平台管理员永远不能选租户」**，而是：

- **不选** → 允许后门（平台视角）  
- **选了** → 故意进入「某租户视角」，后门关闭（和客户视角一致）  

这兼顾运维和合规。

---

## 4. 怎么选才符合「大型架构、又兼容现在」？

结合你们现状，可以这样定（推荐）：

```
现在（单公司）
  organization = 默认组织
  登录：可不显示租户下拉（default）
  数据：org 边界 + dept/self + unrestricted 后门给平台管理员

以后（多客户 SaaS）
  organization.type = tenant 的节点 = 一个付费客户
  普通用户：登录必选 tenant（或只有一个自动选中）
  平台管理员：可不选（后门）或选某 tenant（代客视角，无后门）
  集团客户：再定登录选「集团」还是「子公司」——见下
```

**集团客户二选一（以后再定即可）：**

| 策略 | 登录下拉 | 数据 isolation |
|------|----------|----------------|
| 简单 | 只列子公司 | `organization_id` = 子公司 id |
| 集团总部要看全盘 | 集团 + 各子公司都可选 | 选集团时用 org 树过滤；选子公司则只该子公司 |

---

## 5. 一句话总结

| 问题 | 答案 |
|------|------|
| 租户 = 顶层 org 还是客户公司？ | 都是 `organization` 树的不同层级；**你们定隔离键用哪一层的 id** |
| 登录选 tenant 还是 subsidiary？ | **选哪一层作为本次会话的 org 上下文**；单公司时可不选 |
| 平台管理员与后门？ | **不选租户 → 可走 unrestricted；选了租户 → 强制本 org，后门失效** |

你现在阶段 **不用立刻定死**；单 org 继续用 default 即可。等真要接第二家客户时，再定「租户 = 顶层 org」+「普通用户登录必选 tenant」就够了。

如果你愿意，我可以按你们现在的组织 seed 数据，画一版「单公司 / 两客户 SaaS / 集团三子公司」三种具体登录下拉长什么样（仍用文字 + 树状图，不改代码）。

