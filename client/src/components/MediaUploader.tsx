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
import { checkMediaPermission, getCurrentRequestStatus } from "@/lib/mediaRequests";
import { MediaAccessRequestModal } from "./MediaAccessRequestModal";
import { SubscriptionPrompt } from "./SubscriptionPrompt";
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
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  
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

  // Check media permission and request status when component mounts or user changes
  useEffect(() => {
    const checkPermissionAndStatus = async () => {
      if (!user) {
        setHasMediaPermission(false);
        setIsCheckingPermission(false);
        setRequestStatus(null);
        return;
      }

      setIsCheckingPermission(true);
      
      try {
        // Check current permission
        const { hasPermission } = await checkMediaPermission(user.id);
        setHasMediaPermission(hasPermission);

        // Only check request status if user doesn't have permission
        if (!hasPermission) {
          const { status } = await getCurrentRequestStatus();
          setRequestStatus(status);
        } else {
          setRequestStatus(null); // Clear request status if user has permission
        }

        // Show subscription prompt if recently approved (check status from API call above)
        const currentStatus = hasPermission ? null : requestStatus;
        if (hasPermission && currentStatus === 'approved' && !localStorage.getItem(`subscription-prompt-shown-${user.id}`)) {
          setShowSubscriptionPrompt(true);
          localStorage.setItem(`subscription-prompt-shown-${user.id}`, 'true');
        }
      } catch (error) {
        console.error('Error checking media permission:', error);
        setHasMediaPermission(false);
        setRequestStatus(null);
      } finally {
        setIsCheckingPermission(false);
      }
    };

    checkPermissionAndStatus();
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
      description: "Your link sharing request is under review. You'll be notified when approved.",
    });
    // Refresh permission status
    setRequestStatus('pending');
  };

  const handleSubscribe = () => {
    setShowSubscriptionPrompt(false);
    // Navigate to donations/subscription page
    window.location.href = '/support';
  };

  // Update button text based on permission and request status
  const getButtonText = () => {
    if (isCheckingPermission) return "Checking access...";
    if (!hasMediaPermission) {
      if (requestStatus === 'pending') return "Link Request Pending";
      if (requestStatus === 'denied') return "Request Link Sharing";
      return "Request Link Sharing";
    }
    return children;
  };

  const getButtonIcon = () => {
    if (requestStatus === 'pending') {
      return (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );
  };

  return (
    <div>
      {/* Only show the button if user doesn't have media permission */}
      {!hasMediaPermission && (
        <Button 
          onClick={handleOpenModal} 
          className={buttonClassName}
          disabled={disabled || isCheckingPermission}
          title="Link sharing requires approval - click to request access"
        >
          <div className="flex items-center gap-2">
            {getButtonIcon()}
            {getButtonText()}
          </div>
        </Button>
      )}
      
      {/* For users with permission, show the regular children content */}
      {hasMediaPermission && (
        <Button 
          onClick={handleOpenModal} 
          className={buttonClassName}
          disabled={disabled || isCheckingPermission}
        >
          {children}
        </Button>
      )}

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

      <SubscriptionPrompt
        isOpen={showSubscriptionPrompt}
        onClose={() => setShowSubscriptionPrompt(false)}
        onSubscribe={handleSubscribe}
      />
    </div>
  );
}