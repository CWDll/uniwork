export type NotificationRecipientInput = {
  accountEmail?: string | null;
  emailNotificationsEnabled?: boolean | null;
  notificationEmail?: string | null;
};

export function normalizeNotificationEmail(value?: string | null) {
  const email = value?.trim().toLowerCase() ?? "";

  if (!email) {
    return "";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function getNotificationRecipient({
  accountEmail,
  emailNotificationsEnabled,
  notificationEmail,
}: NotificationRecipientInput) {
  if (emailNotificationsEnabled === false) {
    return null;
  }

  return normalizeNotificationEmail(notificationEmail || accountEmail) || null;
}
