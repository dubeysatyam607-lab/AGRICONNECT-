import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { IProfileRepository } from '../repositories/IProfileRepository';
import { IFarmerProfile } from '../models/FarmerProfile';

/**
 * Enterprise Get Farmer Profile Use Case.
 * Coordinates fetching the user's complete profile across local cache and remote server.
 */
export class GetFarmerProfileUseCase {
  private customRepo?: IProfileRepository;

  constructor(repository?: IProfileRepository) {
    this.customRepo = repository;
  }

  private get repository(): IProfileRepository {
    return this.customRepo || inject<IProfileRepository>(DI_TOKENS.ProfileRepository);
  }

  public async execute(userId?: string): Promise<IFarmerProfile> {
    return await this.repository.getProfile(userId);
  }
}

export const getFarmerProfileUseCase = new GetFarmerProfileUseCase();
