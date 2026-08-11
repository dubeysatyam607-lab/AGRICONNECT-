import { IFarmerProfile, IGpsCoordinates } from '../models/FarmerProfile';

/**
 * Enterprise Abstract Profile Repository Contract.
 * Defines clean DIP operations for profile management, offline synchronization, and GPS mapping.
 */
export interface IProfileRepository {
  /**
   * Retrieves the current farmer's comprehensive agricultural profile.
   * Checks local offline cache first, then synchronizes with remote server.
   */
  getProfile(userId?: string): Promise<IFarmerProfile>;

  /**
   * Updates the farmer profile and stores in local cache and remote database.
   */
  updateProfile(profile: IFarmerProfile): Promise<IFarmerProfile>;

  /**
   * Uploads or sets the profile picture avatar (base64 or remote URL).
   */
  updateProfilePicture(userId: string, avatarDataUrl: string): Promise<string>;

  /**
   * Requests HTML5 geolocation permission and retrieves high-accuracy GPS coordinates.
   */
  captureCurrentGpsCoordinates(): Promise<IGpsCoordinates>;
}
