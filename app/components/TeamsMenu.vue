<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { user, fetchUser } = useUser()
const { isPic } = await useCurrentUser()

onMounted(async () => {
  const { getToken } = useAuth()
  const token = getToken()

  console.log('TOKEN:', token)

  if (token) {
    await fetchUser()
  }
})

console.log('USER:', user.value?.data?.data?.name)

function capitalizeWords(text?: string | null) {
  if (!text) return 'User'

  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const userDisplay = computed(() => {
  const name = user.value?.data?.data?.name
  const avatar = user.value?.data?.data?.avatar

  return {
    name: capitalizeWords(name),
    avatar: {
      src: avatar || '/default-avatar.png',
      alt: name || 'User'
    }
  }
})

const userRoles = computed(() =>
  user.value?.data?.data?.roles?.map((item: { role?: { name?: string } }) => item.role?.name) || []
)

console.log('User Display', user.value?.data?.data?.name)
console.log('User Roles', userRoles.value)

function formatRoleName(role?: string) {
  if (!role) return '-'

  return role
    .toLowerCase()
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const teams = computed(() => {
  const roles = user.value?.data?.data?.roles || []

  if (isPic.value) {
    return [
      {
        label: 'PIC',
        avatar: userDisplay.value.avatar
      }
    ]
  }

  return roles.map((item: { role?: { name?: string } }) => ({
    label: formatRoleName(item.role?.name),
    avatar: userDisplay.value.avatar
  }))
})

const selectedTeam = ref<{ label: string, avatar: { src?: string, alt?: string } } | null>(null)

watchEffect(() => {
  if (!selectedTeam.value && teams.value.length) {
    selectedTeam.value = teams.value[0]
  }
})

const items = computed<DropdownMenuItem[][]>(() => {
  return [
    teams.value.map(team => ({
      ...team,
      onSelect() {
        selectedTeam.value = team
      }
    }))
  ]
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{
      content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)'
    }"
  >
    <UButton
      v-if="selectedTeam"
      v-bind="{
        ...selectedTeam,
        label: collapsed ? undefined : selectedTeam?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>
