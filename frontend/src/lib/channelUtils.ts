/** Kênh general: mọi thành viên workspace đều tham gia. */
export function isGeneralChannel(channel?: { name?: string } | null): boolean {
  return channel?.name?.trim().toLowerCase() === 'general';
}
