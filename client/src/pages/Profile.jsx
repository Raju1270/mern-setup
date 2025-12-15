import { useMutation, useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

import { GetProfileService, UpdateProfileService } from '@/services/authServices'
import { parseError } from '@/utils/parseError'
import { showError } from '@/utils/toast'
import { getInitials } from '@/utils/utils'

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm()

  // FETCH PROFILE.
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: GetProfileService,
  })

  // UPDATE PROFILE.
  const { mutate, isPending } = useMutation({
    mutationFn: UpdateProfileService,
    onSuccess: () => {
      setIsEditing(false)
      refetch()
    },
    onError: (err) => showError(parseError(err)),
  })

  // SUBMIT HANDLER.
  const onSubmit = ({ name, profilePhoto }) =>
    mutate({ name, profilePhoto: profilePhoto || undefined })

  // TOGGLE EDIT MODE.
  const toggleEdit = () => {
    if (!isEditing && profile) {
      setValue('name', profile.userName)
      setValue('profilePhoto', profile.profilePhoto || '')
    }
    setIsEditing((v) => !v)
  }

  // LOADING STATE.
  if (isLoading) {
    return (
      <div className='mx-auto max-w-3xl p-6 space-y-6'>
        <Skeleton className='h-8 w-32' />
        <Card>
          <CardHeader>
            <Skeleton className='h-5 w-40' />
          </CardHeader>
          <CardContent className='space-y-4'>
            <Skeleton className='h-24 w-24 rounded-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className='mx-auto max-w-3xl p-6 space-y-8'>
      {/* HEADER */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Profile</h1>
        <Badge variant={profile.active ? 'secondary' : 'destructive'}>
          {profile.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Card>
        <CardHeader className='pb-4'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>Personal Info</CardTitle>
            {!isEditing && (
              <Button size='sm' variant='ghost' onClick={toggleEdit}>
                Edit
              </Button>
            )}
          </div>
          <CardDescription>
            Basic account and profile details.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isEditing ? (
            <div className='space-y-8'>
              {/* PROFILE HEADER */}
              <div className='flex items-center gap-5'>
                <Avatar className='h-20 w-20'>
                  <AvatarImage src={profile.profilePhoto} />
                  <AvatarFallback className='text-xl'>
                    {getInitials(profile.userName)}
                  </AvatarFallback>
                </Avatar>

                <div className='space-y-1'>
                  <p className='text-lg font-medium'>
                    {profile.userName}
                  </p>

                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Mail className='h-4 w-4' />
                    {profile.email}
                  </div>

                  <Badge variant='outline'>{profile.role}</Badge>
                </div>
              </div>

              {/* META GRID */}
              <div className='grid gap-4 text-sm md:grid-cols-2'>
                <div>
                  <p className='text-muted-foreground'>User ID</p>
                  <p className='font-mono'>{profile.userId}</p>
                </div>

                <div>
                  <p className='text-muted-foreground'>Last Login</p>
                  <p>
                    {profile.lastLogin
                      ? new Date(profile.lastLogin).toLocaleString()
                      : 'Never'}
                  </p>
                </div>

                <div>
                  <p className='text-muted-foreground'>Created</p>
                  <p>{new Date(profile.createdAt).toLocaleString()}</p>
                </div>

                <div>
                  <p className='text-muted-foreground'>Status</p>
                  <p>{profile.active ? 'Active' : 'Deactivated'}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
              <div>
                <Label htmlFor='name'>Full name</Label>
                <Input
                  id='name'
                  disabled={isPending}
                  {...register('name', {
                    required: 'Name is required',
                    minLength: { value: 2, message: 'Min 2 characters' },
                  })}
                />
                {errors.name && (
                  <p className='mt-1 text-sm text-red-500'>
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor='profilePhoto'>Photo URL</Label>
                <Input
                  id='profilePhoto'
                  disabled={isPending}
                  placeholder='https://...'
                  {...register('profilePhoto')}
                />
              </div>

              <div className='flex gap-2 pt-2'>
                <Button type='submit' disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save'}
                </Button>

                <Button
                  type='button'
                  variant='ghost'
                  disabled={isPending}
                  onClick={() => {
                    reset()
                    setIsEditing(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Profile
