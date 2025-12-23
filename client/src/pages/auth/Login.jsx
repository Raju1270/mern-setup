import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { LoginService, VerifyMFALoginService } from '@/services/authServices'
import { parseError } from '@/utils/parseError'
import { showError } from '@/utils/toast'
import { useOtpTimer } from '@/hooks/useOtpTimer'
import { formatTime } from '@/utils/format'

const STEPS = {
  LOGIN: 'LOGIN',
  MFA: 'MFA',
}

// LOGIN PAGE.
const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [step, setStep] = useState(STEPS.LOGIN)
  const [mfaData, setMfaData] = useState(null)

  const { canResend, reset: resetTimer, start, timeLeft } = useOtpTimer()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
    watch,
    setValue,
  } = useForm()

  const { mutate: login, isPending: isLoggingIn } = useMutation({
    mutationFn: LoginService,

    onSuccess: (response) => {
      if (response?.mfaRequired) {
        setMfaData({
          userId: response.userId,
          email: response.email,
        })
        setStep(STEPS.MFA)
        start()
        resetForm()
      } else {
        navigate(from, { replace: true })
      }
    },
  })

  const { mutate: verifyMFA, isPending: isVerifyingMFA } = useMutation({
    mutationFn: VerifyMFALoginService,
    onSuccess: () => {
      navigate(from, { replace: true })
    },
  })

  const onLoginSubmit = (data) => {
    login(data)
  }

  const onMFASubmit = (data) => {
    if (!mfaData || !data.otp) return
    verifyMFA({
      userId: mfaData.userId,
      email: mfaData.email,
      otp: data.otp,
    })
  }

  const handleBackToLogin = () => {
    resetTimer()
    resetForm()
    setStep(STEPS.LOGIN)
    setMfaData(null)
  }

  const maskedEmail = mfaData?.email ? mfaData.email.replace(/(.{2}).+(@.+)/, '$1***$2') : ''

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle className='text-center text-xl'>
          {step === STEPS.LOGIN && 'Welcome Back!'}
          {step === STEPS.MFA && 'Verify MFA Code'}
        </CardTitle>
        <CardDescription className='text-center'>
          {step === STEPS.LOGIN && 'Login to your account'}
          {step === STEPS.MFA && `Enter the code sent to ${maskedEmail}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: Login Form */}
        {step === STEPS.LOGIN && (
          <form onSubmit={handleSubmit(onLoginSubmit)} autoComplete='off'>
            <div className='flex flex-col gap-5'>
              <div className='grid gap-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  {...register('email', {
                    required: 'Email is required',
                  })}
                  id='email'
                  type='email'
                  placeholder='email@example.com'
                  disabled={isLoggingIn}
                  autoComplete='off'
                />
                {errors.email && (
                  <p className='mt-1 text-sm text-red-500'>{errors.email.message}</p>
                )}
              </div>

              <div className='grid gap-2'>
                <div className='flex items-center'>
                  <Label htmlFor='password'>Password</Label>
                  <Link
                    to={'/forgot-password'}
                    className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 4,
                      message: 'Password must be at least 4 characters',
                    },
                  })}
                  id='password'
                  type='password'
                  placeholder='Password'
                  disabled={isLoggingIn}
                  autoComplete='new-password'
                />
                {errors.password && (
                  <p className='mt-1 text-sm text-red-500'>{errors.password.message}</p>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <Button type='submit' className='w-full' disabled={isLoggingIn}>
                  {isLoggingIn ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </div>
            <div className='mt-4 text-center text-sm'>
              Don&apos;t have an account?{' '}
              <Link to={'/signup'} className='underline-offset-4 hover:underline'>
                Sign up
              </Link>
            </div>
          </form>
        )}

        {/* Step 2: MFA Verification */}
        {step === STEPS.MFA && (
          <form onSubmit={handleSubmit(onMFASubmit)} autoComplete='off'>
            <div className='flex flex-col gap-5'>
              <div className='grid gap-2'>
                <InputOTP
                  maxLength={6}
                  disabled={isVerifyingMFA}
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

              {/* Timer Display */}
              <div className='text-center text-sm'>
                {!canResend ? (
                  <p className='text-muted-foreground'>
                    Code expires in <span className='font-semibold'>{formatTime(timeLeft)}</span>
                  </p>
                ) : (
                  <p className='text-destructive'>Code has expired. Please login again.</p>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <Button type='submit' className='w-full' disabled={isVerifyingMFA}>
                  {isVerifyingMFA ? 'Verifying...' : 'Verify Code'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={handleBackToLogin}
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

export default Login
