// utils/handlers.ts
type ToastApi = ReturnType<typeof useToast>

type ErrorLike = {
  response?: { data?: { message?: string } }
  message?: string
}

export const showErrors = (toast: ToastApi, message: string) => {
  toast.add({
    title: 'Failed',
    description: message,
    color: 'error'
  })
}

export const handleError = (toast: ToastApi, err: unknown) => {
  const error = err as ErrorLike
  const message
    = error?.response?.data?.message
      || error?.message
      || 'Failed to add user'

  showErrors(toast, message)
}

export const handleSuccessGeneral = (toast: ToastApi, name: string, message: string) => {
  toast.add({
    title: 'Success',
    description: `New ${message} ${name} added`,
    color: 'success'
  })
}

export const handleSuccess = (toast: ToastApi, name: string) => {
  toast.add({
    title: 'Success',
    description: `New user ${name} added`,
    color: 'success'
  })
}
