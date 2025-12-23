import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { SignupService, VerifySignupOTPService } from '@/services/authServices'
import { useOtpTimer } from '@/hooks/useOtpTimer'
import { useAuthStore } from '@/store/AuthStore'
import { formatTime } from '@/utils/format'

const STEPS = {
  SIGNUP: 'SIGNUP',
  OTP: 'OTP',
}

// SIGNUP PAGE.
const Signup = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.SIGNUP)
  const [signupData, setSignupData] = useState(null)

  const { canResend, reset: resetTimer, start, timeLeft } = useOtpTimer()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
    watch,
    setValue,
  } = useForm()

  // SIGNUP MUTATION.
  const { mutate: signup, isPending: isSigningUp } = useMutation({
    mutationFn: SignupService,
    onSuccess: (response, variables) => {
      setSignupData({
        email: response.email,
        userId: response.userId,
        name: variables.name,
        password: variables.password,
      })
      resetForm()
      setStep(STEPS.OTP)
      start()
    },
  })

  // VERIFY OTP MUTATION.
  const { mutate: verifyOTP, isPending: isVerifyingOTP } = useMutation({
    mutationFn: VerifySignupOTPService,
    onSuccess: (response) => {
      useAuthStore.getState().login(response)
      navigate('/dashboard', { replace: true })
    },
  })

  const onSignupSubmit = (data) => {
    signup(data)
  }

  const onOTPSubmit = (data) => {
    verifyOTP({
      email: signupData.email,
      otp: data.otp,
    })
  }

  const handleResendOTP = () => {
    resetTimer()
    signup({
      name: signupData.name,
      email: signupData.email,
      password: signupData.password,
    })
  }

  const maskedEmail = signupData?.email ? signupData.email.replace(/(.{2}).+(@.+)/, '$1***$2') : ''

  return (
    <>
      {step === STEPS.SIGNUP ? (
        <Card className='w-full'>
          <CardHeader>
            <CardTitle className='text-center text-xl'>Create an account</CardTitle>
            <CardDescription className='text-center'>
              Enter your details to sign up for a new account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSignupSubmit)} autoComplete='off'>
              <div className='flex flex-col gap-5'>
                <div className='grid gap-2'>
                  <Label htmlFor='name'>Full Name</Label>
                  <Input
                    {...register('name', {
                      required: 'Full name is required',
                    })}
                    id='name'
                    type='text'
                    placeholder='Johnny Depp'
                    disabled={isSigningUp}
                    autoComplete='off'
                  />
                  {errors.name && (
                    <p className='mt-1 text-sm text-red-500'>{errors.name.message}</p>
                  )}
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    {...register('email', {
                      required: 'Email is required',
                    })}
                    id='email'
                    type='email'
                    placeholder='email@example.com'
                    disabled={isSigningUp}
                    autoComplete='off'
                  />
                  {errors.email && (
                    <p className='mt-1 text-sm text-red-500'>{errors.email.message}</p>
                  )}
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='password'>Password</Label>
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
                    placeholder='Password'
                    disabled={isSigningUp}
                    autoComplete='new-password'
                  />
                  {errors.password && (
                    <p className='mt-1 text-sm text-red-500'>{errors.password.message}</p>
                  )}
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='confirmPassword'>Confirm Password</Label>
                  <Input
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                    })}
                    id='confirmPassword'
                    type='password'
                    placeholder='Confirm Password'
                    disabled={isSigningUp}
                    autoComplete='new-password'
                  />
                  {errors.confirmPassword && (
                    <p className='mt-1 text-sm text-red-500'>{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className='flex flex-col gap-2'>
                  <Button type='submit' className='w-full' disabled={isSigningUp}>
                    {isSigningUp ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </div>
              </div>

              <div className='mt-4 text-center text-sm'>
                Already have an account?{' '}
                <Link to={'/login'} className='underline-offset-4 hover:underline'>
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className='w-full'>
          <CardHeader>
            <CardTitle className='text-center text-xl'>Verify your email</CardTitle>
            <CardDescription className='text-center'>
              We've sent a verification code to {maskedEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onOTPSubmit)} autoComplete='off'>
              <div className='flex flex-col gap-5'>
                <div className='grid gap-2'>
                  <Label className='text-center'>Verification Code</Label>
                  <InputOTP
                    maxLength={6}
                    disabled={isVerifyingOTP}
                    containerClassName='justify-center'
                    value={watch('otp')}
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
                  {errors.otp && (
                    <p className='mt-1 text-center text-sm text-red-500'>{errors.otp.message}</p>
                  )}
                </div>

                {/* Timer Display */}
                <div className='text-center text-sm'>
                  {!canResend ? (
                    <p className='text-muted-foreground'>
                      Code expires in <span className='font-semibold'>{formatTime(timeLeft)}</span>
                    </p>
                  ) : (
                    <p className='text-destructive'>Code has expired</p>
                  )}
                </div>

                <div className='flex flex-col gap-2'>
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={isVerifyingOTP || !watch('otp') || watch('otp').length !== 6}
                  >
                    {isVerifyingOTP ? 'Verifying...' : 'Verify Email'}
                  </Button>

                  <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    disabled={!canResend || isSigningUp}
                    onClick={handleResendOTP}
                  >
                    {canResend ? 'Resend Code' : `Resend in ${formatTime(timeLeft)}`}
                  </Button>
                </div>
              </div>

              <div className='mt-4 text-center text-sm'>
                Already have an account?{' '}
                <Link to={'/login'} className='underline-offset-4 hover:underline'>
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export default Signup
