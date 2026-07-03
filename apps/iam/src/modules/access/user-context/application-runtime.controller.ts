import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OidcBearerGuard } from '../../security/guards/oidc-bearer.guard';
import { ApplicationUserGuard } from '../../application/guards/application-user.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';

/**
 * flow-admin 业务 API 鉴权范例：
 *   OidcBearerGuard      → 验证 access_token，注入 request.user.id
 *   ApplicationUserGuard → 验证 application_user 进门资格
 *   PermissionsGuard     → 验证 RBAC permission code
 */
@Controller('applications/:applicationId')
export class ApplicationRuntimeController {
  /**
   * GET /api/applications/:applicationId/tasks/demo
   * 需要权限 flow_admin:tasks:view
   */
  @Get('tasks/demo')
  @UseGuards(OidcBearerGuard, ApplicationUserGuard, PermissionsGuard)
  @RequirePermissions('flow_admin:tasks:views')
  demoTasks(@Param('applicationId') applicationId: string) {
    return {
      message: 'Access 鉴权通过（application_user + permission）',
      applicationId,
      items: [
        { id: 'task-1', title: '示例任务 A', status: 'pending' },
        { id: 'task-2', title: '示例任务 B', status: 'done' },
      ],
    };
  }
}
