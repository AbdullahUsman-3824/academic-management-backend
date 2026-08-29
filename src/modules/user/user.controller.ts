import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('by-email')
  findByEmail(@Query('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: string) {
    return this.userService.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: string) {
    return this.userService.activate(id);
  }
}
