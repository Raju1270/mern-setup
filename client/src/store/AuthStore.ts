import { create } from 'zustand'

interface UserData {
  accessToken: string
  userId: string
  userName: string
  email: string
  role: string
  mfaEnabled?: boolean
  profilePhoto?: string
}

interface AuthStore {
  user: UserData | null
  token: string | null
  isAuthenticated: boolean
  login: (data: any) => void
  logout: () => void
  updateUser: (userData: any) => void
}

// GET USER FROM STORAGE.
const getUserFromStorage = (): UserData | null => {
  const user = localStorage.getItem('user_cred')
  return user ? JSON.parse(user) : null
}

// GET TOKEN FROM STORAGE.
const getTokenFromStorage = (): string | null => {
  const user = getUserFromStorage()
  return user?.accessToken || null
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: getUserFromStorage(),
  token: getTokenFromStorage(),
  isAuthenticated: !!getTokenFromStorage(),

  // LOGIN ACTION.
  login: (data) => {
    const userData = {
      accessToken: data.accessToken,
      userId: data.userId,
      userName: data.userName,
      email: data.email,
      role: data.role || 'user',
      mfaEnabled: data.mfaEnabled || false,
      profilePhoto: data.profilePhoto || null,
    }

    localStorage.setItem('user_cred', JSON.stringify(userData))
    set({
      user: userData,
      token: userData.accessToken,
      isAuthenticated: true,
    })
  },

  // LOGOUT ACTION.
  logout: () => {
    localStorage.removeItem('user_cred')
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  },

  // UPDATE USER ACTION.
  updateUser: (userData) => {
    const currentUser = get().user
    const updatedUser = { ...currentUser, ...userData }

    localStorage.setItem('user_cred', JSON.stringify(updatedUser))
    set({ user: updatedUser })
  },

  // CHECK IF USER HAS ROLE.
  hasRole: (role: string) => {
    const { user } = get()
    return user?.role === role
  },

  // CHECK IF AUTHENTICATED.
  checkAuth: () => {
    const token = getTokenFromStorage()
    const isAuth = !!token

    if (!isAuth) {
      get().logout()
    }

    return isAuth
  },
}))
