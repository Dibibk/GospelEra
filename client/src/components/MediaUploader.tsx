import { useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { checkMediaPermission } from "@/lib/mediaRequests";
import { MediaAccessRequestModal } from "./MediaAccessRequestModal";
import { useToast } from '@/hooks/use-toast';

interface MediaUploaderProps {
  maxNumberOfFiles?: number;
  maxImageSize?: number;
  maxVideoSize?: number;
  allowImages?: boolean;
  allowVideos?: boolean;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * Instagram-style media uploader that supports both images and videos
 * 
 * Features:
 * - Supports images (PNG, JPG, WebP) up to 10MB
 * - Supports videos (MP4, MOV, AVI) up to 100MB
 * - Instagram-like interface with preview
 * - Drag and drop support
 * - Progress tracking
 * - File validation
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files (default: 10 for Instagram-like experience)
 * @param props.maxImageSize - Maximum image size in bytes (default: 10MB)
 * @param props.maxVideoSize - Maximum video size in bytes (default: 100MB)
 * @param props.allowImages - Whether to allow image uploads (default: true)
 * @param props.allowVideos - Whether to allow video uploads (default: true)
 * @param props.onGetUploadParameters - Function to get upload parameters
 * @param props.onComplete - Callback when upload completes
 * @param props.buttonClassName - CSS class for the button
 * @param props.children - Button content
 * @param props.disabled - Whether the uploader is disabled
 */
export function MediaUploader({
  maxNumberOfFiles = 10,
  maxImageSize = 5242880, // 5MB for images (dev-friendly)
  maxVideoSize = 20971520, // 20MB for videos (dev-friendly)
  allowImages = true,
  allowVideos = true,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  disabled = false,
}: MediaUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Build allowed file types based on props
  const getAllowedFileTypes = useCallback(() => {
    const types: string[] = [];
    if (allowImages) {
      types.push('image/*');
    }
    if (allowVideos) {
      types.push('video/*');
    }
    return types;
  }, [allowImages, allowVideos]);

  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize: Math.max(maxImageSize, maxVideoSize), // Use the larger limit
        allowedFileTypes: getAllowedFileTypes(),
      },
      autoProceed: false,
    });

    // Add file validation using file-added event
    uppyInstance.on('file-added', (file) => {
      const isImage = file.type?.startsWith('image/') || false;
      const isVideo = file.type?.startsWith('video/') || false;
      const fileSize = file.size || 0;
      
      if (isImage && fileSize > maxImageSize) {
        uppyInstance.removeFile(file.id);
        uppyInstance.info(`${file.name}: Image size must be less than ${Math.round(maxImageSize / 1048576)}MB`, 'error', 5000);
        return;
      }
      
      if (isVideo && fileSize > maxVideoSize) {
        uppyInstance.removeFile(file.id);
        uppyInstance.info(`${file.name}: Video size must be less than ${Math.round(maxVideoSize / 1048576)}MB`, 'error', 5000);
        return;
      }
      
      // Check file type
      if (isImage) {
        const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedImageTypes.includes(file.type)) {
          uppyInstance.removeFile(file.id);
          uppyInstance.info(`${file.name}: Images must be PNG, JPG, or WebP format`, 'error', 5000);
          return;
        }
      }
      
      if (isVideo) {
        const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
        if (!allowedVideoTypes.includes(file.type)) {
          uppyInstance.removeFile(file.id);
          uppyInstance.info(`${file.name}: Videos must be MP4, MOV, or AVI format`, 'error', 5000);
          return;
        }
      }
    });

    return uppyInstance
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false);
      });
  });

  // Check media permission when component mounts or user changes
  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasMediaPermission(false);
        setIsCheckingPermission(false);
        return;
      }

      setIsCheckingPermission(true);
      const { hasPermission } = await checkMediaPermission(user.id);
      setHasMediaPermission(hasPermission);
      setIsCheckingPermission(false);
    };

    checkPermission();
  }, [user]);

  const handleOpenModal = () => {
    if (disabled) return;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to upload media.",
      });
      return;
    }

    if (!hasMediaPermission) {
      setShowRequestModal(true);
      return;
    }

    setShowModal(true);
  };

  const handleRequestSuccess = () => {
    toast({
      title: "Request submitted!",
      description: "Your media access request is under review. You'll be notified when approved.",
    });
  };

  // Update button text based on permission status
  const getButtonText = () => {
    if (isCheckingPermission) return "Checking access...";
    if (!hasMediaPermission) return "Request Media Access";
    return children;
  };

  return (
    <div>
      <Button 
        onClick={handleOpenModal} 
        className={buttonClassName}
        disabled={disabled || isCheckingPermission}
        title={!hasMediaPermission ? "Media upload requires approval - click to request access" : undefined}
      >
        {!hasMediaPermission ? (
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {getButtonText()}
          </div>
        ) : (
          getButtonText()
        )}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        plugins={['Webcam']} // Add webcam support for Instagram-like experience
        showLinkToFileUploadResult={false}
        showProgressDetails={true}
        showSelectedFiles={true}
        showRemoveButtonAfterComplete={true}
        closeModalOnClickOutside={false}
        closeAfterFinish={false}
        disablePageScrollWhenModalOpen={true}
        theme="light"
        note={`Upload images (max ${Math.round(maxImageSize / 1048576)}MB each) or videos (max ${Math.round(maxVideoSize / 1048576)}MB each)`}
      />

      <MediaAccessRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}