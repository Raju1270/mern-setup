import { useMutation } from '@tanstack/react-query'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoginService } from '@/services/authServices'
import { parseError } from '@/utils/parseError'

// LOGIN PAGE.
const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const { mutate: login, isPending } = useMutation({
    mutationFn: LoginService,

    onSuccess: () => {
      navigate(from, { replace: true })
    },

    onError: (error) => {
      console.error('Login failed:', parseError(error))
    },
  })

  const onSubmit = (data) => {
    login(data)
  }

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle className='text-center text-xl'>Welcome Back !</CardTitle>
        <CardDescription className='text-center'>Login to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} autoComplete='off'>
          <div className='flex flex-col gap-5'>
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
              <div className='flex items-center'>
                <Label htmlFor='password'>Password</Label>
                <Link
                  to={'/'}
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

            <div className='flex flex-col gap-2'>
              <Button type='submit' className='w-full'>
                Login
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
      </CardContent>
    </Card>
  )
}

export default Login
