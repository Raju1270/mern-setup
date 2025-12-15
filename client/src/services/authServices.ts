import { apiService } from "@/services/apiService";
import { showError, showSuccess } from "@/utils/toast";
import { useAuthStore } from "../store/AuthStore";
import { parseError } from "../utils/parseError";

type LoginPayload = { email: string; password: string };
type SignupPayload = { name: string; email: string; password: string };
type EmailPayload = { email: string };
type OTPPayload = { email: string; otp: string };
type ResetPasswordPayload = { email: string; password: string };
type VerifyMFAPayload = { userId: string; email: string; otp: string };
type UpdateProfilePayload = { name?: string; profilePhoto?: string };
type OTPVerifyPayload = { otp: string };

// LOGIN SERVICE.
export const LoginService = async (payload: LoginPayload) => {
  try {
    const response = await apiService.post("api/v1/auth/login", payload);

    if (response?.success) {
      if (response.mfaRequired) {
        showSuccess("MFA code sent to your email!");
        return response;
      }

      if (response.accessToken) {
        useAuthStore.getState().login(response);
        showSuccess("Login successful!");
        return response;
      }
    }

    showError("Invalid response from server");
    throw new Error("Invalid login response");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// SIGNUP SERVICE.
export const SignupService = async (payload: SignupPayload) => {
  try {
    const response = await apiService.post("api/v1/auth/signup", payload);

    if (response?.success && response?.accessToken) {
      useAuthStore.getState().login(response);
      showSuccess("Account created successfully!");
      return response;
    }

    showError("Invalid response from server");
    throw new Error("Invalid signup response");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// FORGET PASSWORD SERVICE - Send OTP to email.
export const ForgetPasswordService = async (payload: EmailPayload) => {
  try {
    const response = await apiService.post("api/v1/auth/forgot-password", payload);

    if (response?.success) {
      showSuccess("OTP sent to your email!");
      return response;
    }

    showError("Failed to send OTP");
    throw new Error("Failed to send OTP");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// VERIFY OTP SERVICE - Verify the OTP entered by user.
export const VerifyOTPService = async (payload: OTPPayload) => {
  try {
    const response = await apiService.post("api/v1/auth/verify-otp", payload);

    if (response?.success) {
      showSuccess("OTP verified successfully!");
      return response;
    }

    showError("Invalid OTP");
    throw new Error("Invalid OTP");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// RESET PASSWORD SERVICE - Reset password after OTP verification.
export const ResetPasswordService = async (payload: ResetPasswordPayload) => {
  try {
    const response = await apiService.post("api/v1/auth/reset-password", payload);

    if (response?.success) {
      showSuccess("Password reset successfully!");
      return response;
    }

    showError("Failed to reset password");
    throw new Error("Failed to reset password");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// VERIFY MFA LOGIN SERVICE - Verify MFA code during login.
export const VerifyMFALoginService = async (payload: VerifyMFAPayload) => {
  try {
    const response = await apiService.post("api/v1/auth/mfa/verify-login", payload);

    if (response?.success && response?.accessToken) {
      useAuthStore.getState().login(response);
      showSuccess("Login successful!");
      return response;
    }

    showError("Invalid MFA code");
    throw new Error("Invalid MFA code");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// GET PROFILE SERVICE - Fetch user profile.
export const GetProfileService = async () => {
  try {
    const response = await apiService.get("api/v1/auth/profile");

    if (response?.success && response?.user) {
      return response.user;
    }

    showError("Failed to fetch profile");
    throw new Error("Failed to fetch profile");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// UPDATE PROFILE SERVICE - Update user profile.
export const UpdateProfileService = async (payload: UpdateProfilePayload) => {
  try {
    const response = await apiService.patch("api/v1/auth/profile", payload);

    if (response?.success && response?.user) {
      useAuthStore.getState().updateUser(response.user);
      showSuccess("Profile updated successfully!");
      return response.user;
    }

    showError("Failed to update profile");
    throw new Error("Failed to update profile");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// ENABLE MFA SERVICE - Enable MFA for user.
export const EnableMFAService = async () => {
  try {
    const response = await apiService.post("api/v1/auth/mfa/enable");

    if (response?.success) {
      showSuccess(response.message || "OTP sent to your email!");
      return response;
    }

    showError("Failed to enable MFA");
    throw new Error("Failed to enable MFA");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// VERIFY MFA SETUP SERVICE - Verify MFA setup with OTP.
export const VerifyMFASetupService = async (payload: OTPVerifyPayload) => {
  try {
    const response = await apiService.post("api/v1/auth/mfa/verify-setup", payload);

    if (response?.success) {
      showSuccess(response.message || "MFA enabled successfully!");
      return response;
    }

    showError("Failed to verify MFA");
    throw new Error("Failed to verify MFA");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// DISABLE MFA SERVICE - Disable MFA for user.
export const DisableMFAService = async () => {
  try {
    const response = await apiService.post("api/v1/auth/mfa/disable");

    if (response?.success) {
      showSuccess(response.message || "MFA disabled successfully!");
      return response;
    }

    showError("Failed to disable MFA");
    throw new Error("Failed to disable MFA");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};

// DEACTIVATE ACCOUNT SERVICE - Deactivate user account.
export const DeactivateAccountService = async () => {
  try {
    const response = await apiService.post("api/v1/auth/deactivate");

    if (response?.success) {
      showSuccess(response.message || "Account deactivated successfully!");
      useAuthStore.getState().logout();
      return response;
    }

    showError("Failed to deactivate account");
    throw new Error("Failed to deactivate account");
  } catch (error) {
    showError(parseError(error));
    throw error;
  }
};
