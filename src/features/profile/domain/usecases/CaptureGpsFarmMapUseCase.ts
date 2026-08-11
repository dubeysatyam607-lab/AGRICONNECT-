import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { IProfileRepository } from '../repositories/IProfileRepository';
import { IGpsCoordinates } from '../models/FarmerProfile';

/**
 * Enterprise Capture GPS Farm Map Use Case.
 * Interacts with browser HTML5 Geolocation API to fetch coordinates, calculate accuracy, and support farm mapping.
 */
export class CaptureGpsFarmMapUseCase {
  private customRepo?: IProfileRepository;

  constructor(repository?: IProfileRepository) {
    this.customRepo = repository;
  }

  private get repository(): IProfileRepository {
    return this.customRepo || inject<IProfileRepository>(DI_TOKENS.ProfileRepository);
  }

  public async execute(): Promise<IGpsCoordinates> {
    return await this.repository.captureCurrentGpsCoordinates();
  }
}

export const captureGpsFarmMapUseCase = new CaptureGpsFarmMapUseCase();
