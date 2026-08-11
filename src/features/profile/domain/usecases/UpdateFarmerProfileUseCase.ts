import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { IProfileRepository } from '../repositories/IProfileRepository';
import { IFarmerProfile } from '../models/FarmerProfile';
import { farmerProfileSchema } from '../models/ProfileValidations';
import { ValidationException } from '@/core/errors/AppException';

/**
 * Enterprise Update Farmer Profile Use Case.
 * Validates the profile against Zod business rules before synchronizing across local and remote storage.
 */
export class UpdateFarmerProfileUseCase {
  private customRepo?: IProfileRepository;

  constructor(repository?: IProfileRepository) {
    this.customRepo = repository;
  }

  private get repository(): IProfileRepository {
    return this.customRepo || inject<IProfileRepository>(DI_TOKENS.ProfileRepository);
  }

  public async execute(profile: IFarmerProfile): Promise<IFarmerProfile> {
    // 1. Zod Validation
    const validationResult = farmerProfileSchema.safeParse(profile);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || 'Invalid farmer profile details.';
      throw new ValidationException(firstError);
    }

    // 2. Persist to repository
    const updated = await this.repository.updateProfile(profile);
    return updated;
  }
}

export const updateFarmerProfileUseCase = new UpdateFarmerProfileUseCase();
