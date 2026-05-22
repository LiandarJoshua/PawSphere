import { Module } from '@nestjs/common';
import { PetsService } from './pets.service';
import { PetsController, HouseholdsController } from './pets.controller';

@Module({
  providers: [PetsService],
  controllers: [PetsController, HouseholdsController],
  exports: [PetsService],
})
export class PetsModule {}
