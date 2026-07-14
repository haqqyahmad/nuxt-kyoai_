<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { isPic, roles: currentRoles, user: currentUser } = await useCurrentUser()

function formatRoleName(role?: string) {
  if (!role) return '-'

  return role
    .toLowerCase()
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const userDisplay = computed(() => {
  const name = currentUser.value?.name
  const avatar = currentUser.value?.avatar

  return {
    name: name ? formatRoleName(name) : 'User',
    avatar: {
      src: avatar || '/default-avatar.png',
      alt: name || 'User'
    }
  }
})

const teams = computed(() => {
  const roleNames = currentRoles.value

  if (!roleNames.length) {
    return [{
      label: isPic.value ? 'PIC' : 'User',
      avatar: userDisplay.value.avatar
    }]
  }

  return roleNames.map(name => ({
    label: formatRoleName(name),
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
