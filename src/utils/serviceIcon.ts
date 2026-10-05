import { Box, Cloud, CreditCard, Globe, Server, Webhook } from 'lucide-vue-next'
import type { Component } from 'vue'

interface IconMeta {
  icon: Component
  cls: string
}

const MAP: Record<string, IconMeta> = {
  域名: { icon: Globe, cls: 'bg-[#10b981]' },
  DNS: { icon: Cloud, cls: 'bg-[#f59e0b]' },
  CDN: { icon: Cloud, cls: 'bg-[#3b82f6]' },
  VPS: { icon: Server, cls: 'bg-[#6366f1]' },
  虚拟主机: { icon: Server, cls: 'bg-[#0ea5e9]' },
  API: { icon: Webhook, cls: 'bg-[#14b8a6]' },
  订阅: { icon: CreditCard, cls: 'bg-[#8b5cf6]' },
}

export function serviceIcon(type: string): IconMeta {
  return MAP[type] ?? { icon: Box, cls: 'bg-[#64748b]' }
}
