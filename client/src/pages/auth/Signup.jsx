import { useMutation } from '@tanstack/react-query'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignupService } from '@/services/authServices'
import { parseError } from '@/utils/parseError'

// SIGNUP PAGE.
const Signup = () => {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const { mutate: signup, isPending } = useMutation({
    mutationFn: SignupService,

    onSuccess: () => {
      navigate('/dashboard', { replace: true })
    },

    onError: (error) => {
      console.error('Signup failed:', parseError(error))
    },
  })

  const onSubmit = (data) => {
    signup(data)
  }

  return (
    <Card className='w-full '>
      <CardHeader>
        <CardTitle className='text-center text-xl'>Create an account</CardTitle>
        <CardDescription className='text-center'>
          Enter your details to sign up for a new account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} autoComplete='off'>
          <div className='flex flex-col gap-5'>
            <div className='grid gap-2'>
              <Label htmlFor='name'>Full Name</Label>
              <Input
                {...register('name', {
                  required: 'Full name is required',
                })}
                id={useId()}
                type='text'
                placeholder='Johnny Depp'
                disabled={isPending}
                autoComplete='off'
              />
              {errors.name && <p className='mt-1 text-sm text-red-500'>{errors.name.message}</p>}
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                {...register('email', {
                  required: 'Email is required',
                })}
                id={useId()}
                type='email'
                placeholder='email@example.com'
                disabled={isPending}
                autoComplete='off'
              />
              {errors.email && <p className='mt-1 text-sm text-red-500'>{errors.email.message}</p>}
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
                id={useId()}
                type='password'
                placeholder='Password'
                disabled={isPending}
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
                id={useId()}
                type='password'
                placeholder='Confirm Password'
                disabled={isPending}
                autoComplete='new-password'
              />
              {errors.confirmPassword && (
                <p className='mt-1 text-sm text-red-500'>{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className='flex flex-col gap-2'>
              <Button type='submit' className='w-full' disabled={isPending}>
                {isPending ? 'Creating account...' : 'Sign Up'}
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
  )
}

export default Signup
