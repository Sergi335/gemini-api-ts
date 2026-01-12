/**
 * Script para cambiar la suscripción de un usuario (solo para desarrollo/testing)
 *
 * Uso:
 *   npx tsx scripts/setSubscription.ts <email> <plan> [--calls <número>]
 *
 * Ejemplos:
 *   npx tsx scripts/setSubscription.ts user@mail.com PRO
 *   npx tsx scripts/setSubscription.ts user@mail.com FREE --calls 15
 *   npx tsx scripts/setSubscription.ts user@mail.com ENTERPRISE
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import users from '../src/models/schemas/userSchema'

type PlanName = 'FREE' | 'PRO' | 'ENTERPRISE'

interface UpdateData {
  subscription: {
    status: 'free' | 'active'
    plan: PlanName
    cancelAtPeriodEnd: boolean
    currentPeriodEnd?: Date
  }
  llmCallsThisMonth?: number
  llmCallsResetAt?: Date
}

async function main (): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
Uso: npx tsx scripts/setSubscription.ts <email> <plan> [opciones]

Planes disponibles: FREE, PRO, ENTERPRISE

Opciones:
  --calls <número>   Establecer el número de llamadas LLM usadas este mes

Ejemplos:
  npx tsx scripts/setSubscription.ts user@mail.com PRO
  npx tsx scripts/setSubscription.ts user@mail.com FREE --calls 15
`)
    process.exit(1)
  }

  const email = args[0]
  const plan = args[1].toUpperCase() as PlanName

  if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
    console.error('❌ Plan inválido. Usa: FREE, PRO, o ENTERPRISE')
    process.exit(1)
  }

  // Parsear opciones
  let llmCalls: number | undefined
  const callsIndex = args.indexOf('--calls')
  if (callsIndex !== -1 && args[callsIndex + 1]) {
    llmCalls = parseInt(args[callsIndex + 1], 10)
  }

  // Conectar a MongoDB
  const dbUri = process.env.DB_URI_TEST
  if (!dbUri) {
    console.error('❌ DB_URI no está definida en .env')
    process.exit(1)
  }

  await mongoose.connect(dbUri)
  console.log('✅ Conectado a MongoDB')

  // Buscar usuario
  const user = await users.findOne({ email })
  if (!user) {
    console.error(`❌ Usuario no encontrado: ${email}`)
    await mongoose.disconnect()
    process.exit(1)
  }

  // Preparar datos de actualización
  const updateData: UpdateData = {
    subscription: {
      status: plan === 'FREE' ? 'free' : 'active',
      plan,
      cancelAtPeriodEnd: false
    }
  }

  // Para planes de pago, simular período de suscripción
  if (plan !== 'FREE') {
    const oneMonthFromNow = new Date()
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
    updateData.subscription.currentPeriodEnd = oneMonthFromNow
  }

  // Actualizar llamadas LLM si se especificó
  if (llmCalls !== undefined) {
    updateData.llmCallsThisMonth = llmCalls
    updateData.llmCallsResetAt = new Date()
  }

  // Aplicar actualización
  await users.findOneAndUpdate({ email }, { $set: updateData })

  console.log(`
✅ Usuario actualizado correctamente!

📧 Email: ${email}
📋 Plan: ${plan}
📊 Status: ${updateData.subscription.status}
${llmCalls !== undefined ? `🔢 Llamadas LLM: ${llmCalls}` : ''}
${plan !== 'FREE' ? `📅 Período hasta: ${updateData.subscription.currentPeriodEnd?.toLocaleDateString()}` : ''}
`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
