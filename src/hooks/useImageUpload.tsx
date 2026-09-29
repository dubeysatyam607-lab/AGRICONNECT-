import { useState } from "react";
import { useAuth } from "./useAuth";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  publicIdFromUrl,
} from "@/lib/cloudinary-service";

/**
 * Uploads and deletes user images through Cloudinary (unsigned preset, so no
 * secret is exposed). The `folder` argument keeps listing images organised
 * (e.g. "cattle-images", "store-images", "equipment-images") and images are
 * namespaced under the signed-in user's id to prevent cross-user deletion.
 */
export const useImageUpload = (folder: string = "cattle-images") => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const uploadImage = async (file: File): Promise<string> => {
    if (!user) {
      throw new Error("Must be logged in to upload images");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("Please select an image file");
    }

    // Strict client-side check to prevent arbitrary extensions
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      throw new Error("Only JPG, PNG, and WebP images are allowed");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image must be less than 5MB");
    }

    setUploading(true);

    try {
      const fileName = `${Date.now()}.${fileExt}`;
      // Rename the file before upload so Cloudinary's public_id is deterministic
      const stamped = new File([file], fileName, { type: file.type });
      const { secureUrl } = await uploadToCloudinary(stamped, `${folder}/${user.id}`);
      return secureUrl;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageUrl: string): Promise<void> => {
    if (!user) throw new Error("You must be signed in to remove a photo.");

    const publicId = publicIdFromUrl(imageUrl);
    if (!publicId || !publicId.includes("/")) return; // legacy (non-Cloudinary) URLs are left alone

    // Prevent IDOR: users can only delete their own uploaded images
    if (!publicId.startsWith(`${folder}/${user.id}/`)) {
      throw new Error("Unauthorized: You can only delete your own photos.");
    }

    await deleteFromCloudinary(publicId);
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
  };
};