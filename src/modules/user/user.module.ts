import { Module } from '@nestjs/common';
import { PermissionService } from './permission/permission.service';
import { RolePermissionService } from './role-permission/role-permission.service';
import { RoleService } from './role/role.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, RoleService, PermissionService, RolePermissionService],
  exports: [UserService, RoleService, PermissionService, RolePermissionService],
})
export class UserModule {}
