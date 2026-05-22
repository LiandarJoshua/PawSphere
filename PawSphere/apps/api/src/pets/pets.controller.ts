import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('pets')
@ApiBearerAuth()
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  @ApiOperation({ summary: "List all pets in the user's household" })
  findAll(@CurrentUser() user: User) {
    return this.petsService.findAll(user);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new pet to the household' })
  create(@CurrentUser() user: User, @Body() dto: CreatePetDto) {
    return this.petsService.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single pet by ID' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.petsService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pet' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdatePetDto) {
    return this.petsService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a pet' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.petsService.remove(user, id);
  }

  @Get(':id/vaccinations')
  @ApiOperation({ summary: "List a pet's vaccination history" })
  findVaccinations(@CurrentUser() user: User, @Param('id') id: string) {
    return this.petsService.findVaccinations(user, id);
  }

  @Post(':id/vaccinations')
  @ApiOperation({ summary: 'Add a vaccination record to a pet' })
  addVaccination(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateVaccinationDto,
  ) {
    return this.petsService.addVaccination(user, id, dto);
  }
}

@ApiTags('households')
@ApiBearerAuth()
@Controller('households')
export class HouseholdsController {
  constructor(private readonly petsService: PetsService) {}

  @Get('members')
  @ApiOperation({ summary: 'Get household members' })
  getMembers(@CurrentUser() user: User) {
    return this.petsService.getHouseholdMembers(user.id);
  }

  @Post('members')
  @ApiOperation({ summary: 'Invite a household member by email' })
  inviteMember(@CurrentUser() user: User, @Body('email') email: string) {
    return this.petsService.inviteHouseholdMember(user.id, email);
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a household member' })
  removeMember(@CurrentUser() user: User, @Param('memberId') memberId: string) {
    return this.petsService.removeHouseholdMember(user.id, memberId);
  }
}
