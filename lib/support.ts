export const WHATSAPP_SUPPORT_NUMBER = "5584920015085"
export const WHATSAPP_SUPPORT_DEFAULT_MESSAGE =
  "Olá! Estou usando o AprovaOAB e gostaria de suporte."

export function whatsappSupportUrl(message: string = WHATSAPP_SUPPORT_DEFAULT_MESSAGE) {
  return `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`
}
