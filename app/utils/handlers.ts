// utils/handlers.ts
export const showErrors = (toast: any, message: string) => {
  toast.add({
    title: 'Failed',
    description: message,
    color: 'error'
  })
}

export const handleError = (toast: any, err: any) => {
  const message
    = err?.response?.data?.message
      || err?.message
      || 'Failed to add user'

  showError(toast, message)
}

export const handleSuccess = (toast: any, name: string) => {
  toast.add({
    title: 'Success',
    description: `New user ${name} added`,
    color: 'success'
  })
}
