import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { useOtpTimer } from '@/hooks/useOtpTimer'
import {
  ForgetPasswordService,
  ResetPasswordService,
  VerifyOTPService,
} from '@/services/authServices'
import { parseError } from '@/utils/parseError'
import { showError } from '@/utils/toast'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { formatTime } from '@/utils/format'

const STEPS = {
  EMAIL: 'EMAIL',
  OTP: 'OTP',
  PASSWORD: 'PASSWORD',
}


const ForgetPassword = () => {
  const {
    canResend,
    reset: resetTimer,
    start,
    timeLeft,
  } = useOtpTimer(5 * 60)

  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
    watch,
    setValue,
  } = useForm()


  // Send OTP mutation
  const { mutate: sendOTP, isPending: isSendingOTP } = useMutation({
    mutationFn: ForgetPasswordService,
    onSuccess: () => {
      setStep(STEPS.OTP)
      start()
      resetForm()
    },
    onError: (error) => showError(parseError(error))
  })

  // Verify OTP mutation
  const { mutate: verifyOTP, isPending: isVerifyingOTP } = useMutation({
    mutationFn: VerifyOTPService,
    onSuccess: () => {
      setStep(STEPS.PASSWORD)
      resetForm()
    },
    onError: (error) => showError(parseError(error))
  })

  // Reset password mutation
  const { mutate: resetPassword, isPending: isResettingPassword } = useMutation({
    mutationFn: ResetPasswordService,
    onSuccess: () => {
      navigate('/login', { replace: true })
    },
    onError: (error) => showError(parseError(error))
  })

  // Handle email submission
  const onEmailSubmit = ({ email }) => {
    setEmail(email)
    sendOTP({ email })
  }


  // Handle OTP submission
  const onOTPSubmit = ({ otp }) => {
    verifyOTP({ email, otp })
  }


  // Handle new password submission
  const onPasswordSubmit = ({ password }) => {
    resetPassword({ email, password })
  }


  // Handle resend OTP
  const handleResendOTP = () => {
    if (!email) return
    sendOTP({ email })
  }

  const password = watch('password')

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, '$1***$2')
    : ''



  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle className='text-center text-xl'>
          {step === STEPS.EMAIL && 'Forgot Password'}
          {step === STEPS.OTP && 'Verify OTP'}
          {step === STEPS.PASSWORD && 'Reset Password'}
        </CardTitle>
        <CardDescription className='text-center'>
          {step === STEPS.EMAIL && 'Enter your email to receive an OTP'}
          {step === STEPS.OTP && `Enter the OTP sent to ${maskedEmail}`}
          {step === STEPS.PASSWORD && 'Create a new password for your account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: Email Input */}
        {step === STEPS.EMAIL && (
          <form onSubmit={handleSubmit(onEmailSubmit)} autoComplete='off'>
            <div className='flex flex-col gap-5'>
              <div className='grid gap-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  id='email'
                  type='email'
                  placeholder='email@example.com'
                  disabled={isSendingOTP}
                  autoComplete='off'
                />
                {errors.email && (
                  <p className='mt-1 text-sm text-red-500'>{errors.email.message}</p>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <Button type='submit' className='w-full' disabled={isSendingOTP}>
                  {isSendingOTP ? 'Sending OTP...' : 'Continue'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Step 2: OTP Input */}
        {step === STEPS.OTP && (
          <form onSubmit={handleSubmit(onOTPSubmit)} autoComplete='off'>
            <div className='flex flex-col gap-5'>
              <div className='grid gap-2'>
                <Label htmlFor='otp'>OTP Code</Label>
                <InputOTP
                  maxLength={6}
                  disabled={isVerifyingOTP}
                  containerClassName='justify-center'
                  value={watch('otp') || ''}
                  onChange={(value) => setValue('otp', value)}
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
                {errors.otp && <p className='mt-1 text-sm text-red-500'>{errors.otp.message}</p>}
              </div>

              {/* Timer and Resend */}
              <div className='text-center text-sm'>
                {!canResend ? (
                  <p className='text-muted-foreground'>
                    Resend OTP in <span className='font-semibold'>{formatTime(timeLeft)}</span>
                  </p>
                ) : (
                  <button
                    type='button'
                    onClick={handleResendOTP}
                    className='text-primary underline-offset-4 hover:underline'
                    disabled={!canResend || isSendingOTP}
                  >
                    {isSendingOTP ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <Button type='submit' className='w-full' disabled={isVerifyingOTP}>
                  {isVerifyingOTP ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={() => {
                    resetTimer()
                    resetForm()
                    setStep(STEPS.EMAIL)
                  }}
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Step 3: New Password Input */}
        {step === STEPS.PASSWORD && (
          <form onSubmit={handleSubmit(onPasswordSubmit)} autoComplete='off'>
            <div className='flex flex-col gap-5'>
              <div className='grid gap-2'>
                <Label htmlFor='password'>New Password</Label>
                <Input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  id='password'
                  type='password'
                  placeholder='Enter new password'
                  disabled={isResettingPassword}
                  autoComplete='new-password'
                />
                {errors.password && (
                  <p className='mt-1 text-sm text-red-500'>{errors.password.message}</p>
                )}
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='confirmPassword'>Confirm New Password</Label>
                <Input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                  id='confirmPassword'
                  type='password'
                  placeholder='Confirm new password'
                  disabled={isResettingPassword}
                  autoComplete='new-password'
                />
                {errors.confirmPassword && (
                  <p className='mt-1 text-sm text-red-500'>{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <Button type='submit' className='w-full' disabled={isResettingPassword}>
                  {isResettingPassword ? 'Resetting Password...' : 'Reset Password'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default ForgetPassword
