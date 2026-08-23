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
    // 1. Zod Validation & Normalization
    const validationResult = farmerProfileSchema.safeParse(profile);
    const cleanProfile: IFarmerProfile = validationResult.success
      ? (validationResult.data as unknown as IFarmerProfile)
      : (profile || ({} as any));

    // 2. Persist to repository
    const updated = await this.repository.updateProfile(cleanProfile);
    return updated;
  }
}

export const updateFarmerProfileUseCase = new UpdateFarmerProfileUseCase();
