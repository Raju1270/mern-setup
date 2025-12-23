import { useMutation, useQuery } from '@tanstack/react-query'
import { Shield, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useOtpTimer } from '@/hooks/useOtpTimer'
import {
  DeactivateAccountService,
  GetProfileService,
  ToggleMFAService,
  VerifyMFAToggleService,
} from '@/services/authServices'
import { parseError } from '@/utils/parseError'
import { showError } from '@/utils/toast'
import { ModeToggle } from '@/components/mode-toggle'

const MFA_STEPS = {
  IDLE: 'IDLE',
  VERIFY: 'VERIFY',
}

// FORMAT TIME AS MM:SS.
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const Settings = () => {
  const navigate = useNavigate()
  const [mfaStep, setMfaStep] = useState(MFA_STEPS.IDLE)

  const { canResend, reset: resetTimer, start, timeLeft } = useOtpTimer()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm()

  // FETCH PROFILE.
  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: GetProfileService,
  })

  // TOGGLE MFA
  const { mutate: toggleMFA, isPending: isTogglingMFA } = useMutation({
    mutationFn: ToggleMFAService,
    onSuccess: (data) => {
      setMfaStep(MFA_STEPS.VERIFY)
      start()
      resetForm()
    },
  })

  // VERIFY MFA TOGGLE.
  const { mutate: verifyMFAToggle, isPending: isVerifyingMFA } = useMutation({
    mutationFn: VerifyMFAToggleService,
    onSuccess: () => {
      setMfaStep(MFA_STEPS.IDLE)
      resetTimer()
      refetch()
    },
  })

  // DEACTIVATE ACCOUNT.
  const { mutate: deactivateAccount, isPending: isDeactivating } = useMutation({
    mutationFn: DeactivateAccountService,
    onSuccess: () => {
      navigate('/login', { replace: true })
    },
  })

  // HANDLE MFA TOGGLE.
  const handleToggleMFA = () => {
    toggleMFA()
  }

  // HANDLE MFA VERIFY.
  const onMFAVerifySubmit = (data) => {
    verifyMFAToggle({ otp: data.otp })
  }

  // LOADING STATE.
  if (isLoading) {
    return (
      <div className='container mx-auto max-w-4xl space-y-6 p-6'>
        <Skeleton className='h-10 w-48' />
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-32' />
          </CardHeader>
          <CardContent className='space-y-4'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className='container mx-auto max-w-4xl space-y-6 p-6'>
      <h1 className='text-3xl font-bold'>Settings</h1>

      <ModeToggle />

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className=''>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <Label className='text-base'>Two-Factor Authentication (MFA)</Label>
              </div>
              <Badge variant={profile.mfaEnabled ? 'default' : 'secondary'}>
                {profile.mfaEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            {mfaStep === MFA_STEPS.IDLE ? (
              <div>
                {!profile.mfaEnabled ? (
                  <Button onClick={handleToggleMFA} disabled={isTogglingMFA}>
                    {isTogglingMFA ? 'Enabling...' : 'Enable MFA'}
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant='destructive' disabled={isTogglingMFA}>
                        {isTogglingMFA ? 'Processing...' : 'Disable MFA'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reduce the security of your account. You can re-enable it
                          anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleToggleMFA}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit(onMFAVerifySubmit)} className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Enter Verification Code</Label>
                  <p className='text-sm text-muted-foreground'>
                    We've sent a code to {profile.email} to{' '}
                    {profile.mfaEnabled ? 'disable' : 'enable'} MFA
                  </p>
                  <InputOTP
                    {...register('otp', {
                      required: 'Verification code is required',
                      pattern: {
                        value: /^[0-9]{6}$/,
                        message: 'Code must be 6 digits',
                      },
                    })}
                    maxLength={6}
                    disabled={isVerifyingMFA}
                    containerClassName='justify-start'
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  {errors.otp && <p className='text-sm text-red-500'>{errors.otp.message}</p>}
                </div>

                <div className='text-sm'>
                  {!canResend ? (
                    <p className='text-muted-foreground'>
                      Code expires in <span className='font-semibold'>{formatTime(timeLeft)}</span>
                    </p>
                  ) : (
                    <p className='text-destructive'>Code has expired. Please try again.</p>
                  )}
                </div>

                <div className='flex gap-2'>
                  <Button type='submit' disabled={isVerifyingMFA}>
                    {isVerifyingMFA ? 'Verifying...' : 'Verify Code'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setMfaStep(MFA_STEPS.IDLE)
                      resetTimer()
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className='border-destructive'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-destructive'>
            <ShieldAlert className='h-5 w-5' />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='destructive' disabled={isDeactivating}>
                {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will deactivate your account. You will be logged out and won't be able to
                  access your account. Contact support to reactivate.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deactivateAccount()}
                  className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                >
                  Deactivate Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>


    </div>
  )
}

export default Settings
