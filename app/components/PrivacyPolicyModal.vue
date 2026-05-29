<!-- app/components/PrivacyPolicyModal.vue -->
<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Privacy Policy"
    description="How Kyoai Medical Services collects, uses, and protects your information."
    :ui="{
      content: 'max-w-4xl',
      body: 'max-h-[72vh] overflow-y-auto p-6',
      footer: 'justify-end'
    }"
  >
    <template #body>
      <div class="space-y-6">
        <div class="space-y-6 p-6">
          <div class="rounded-xl border border-default bg-muted/30 p-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-shield-check"
                class="mt-0.5 size-6 text-primary"
              />

              <div>
                <h3 class="font-semibold">
                  Privacy Commitment
                </h3>

                <p class="mt-1 text-sm text-muted">
                  Last Updated: May 29, 2026
                </p>

                <p class="mt-3 text-sm leading-6">
                  Kyoai Medical Services respects your privacy and is committed
                  to protecting your personal information when you use our
                  Medical Examination Management System.
                </p>
              </div>
            </div>
          </div>

          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-database" class="size-5 text-primary" />

              <h3 class="text-base font-semibold">
                Information We Collect
              </h3>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div class="rounded-lg border border-default p-3 text-sm">
                Name
              </div>
              <div class="rounded-lg border border-default p-3 text-sm">
                Email address
              </div>
              <div class="rounded-lg border border-default p-3 text-sm">
                Employee identification number
              </div>
              <div class="rounded-lg border border-default p-3 text-sm">
                Company information
              </div>
              <div class="rounded-lg border border-default p-3 text-sm sm:col-span-2">
                Medical examination appointment data
              </div>
            </div>
          </section>

          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-cookie" class="size-5 text-primary" />

              <h3 class="text-base font-semibold">
                Cookies
              </h3>
            </div>

            <p class="text-sm leading-6 text-muted">
              We use essential cookies to maintain user sessions, remember
              preferences, and improve website functionality. These cookies are
              required for the system to work properly.
            </p>
          </section>

          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-lock-keyhole" class="size-5 text-primary" />

              <h3 class="text-base font-semibold">
                Data Security
              </h3>
            </div>

            <p class="text-sm leading-6 text-muted">
              Access to personal information is restricted to authorized
              personnel only. We apply appropriate security measures to help
              prevent unauthorized access, disclosure, alteration, or loss.
            </p>
          </section>

          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-hospital" class="size-5 text-primary" />

              <h3 class="text-base font-semibold">
                Medical Information
              </h3>
            </div>

            <p class="text-sm leading-6 text-muted">
              Medical information is used only for examination administration,
              healthcare services, reporting, and related operational purposes.
            </p>
          </section>

          <section class="rounded-xl border border-default p-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-building-2"
                class="mt-0.5 size-5 text-primary"
              />

              <div class="space-y-1 text-sm">
                <h3 class="font-semibold">
                  Contact Us
                </h3>

                <p class="text-muted">
                  Kyoai Medical Services
                </p>

                <p>
                  Email:
                  <span class="text-primary">
                    info@kyoaims.com
                  </span>
                </p>

                <p>
                  Website:
                  <span class="text-primary">
                    www.kyoaims.com
                  </span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        label="Close"
        color="neutral"
        variant="outline"
        @click="open = false"
      />
    </template>
  </UModal>
</template>
