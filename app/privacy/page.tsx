import Link from 'next/link'
export default function Privacy() {
  return <main className='mx-auto max-w-2xl overflow-y-auto p-6 text-gray-800'>
    <h1 className='mb-4 text-2xl font-bold'>Privacidad · Privacy</h1>
    <p className='mb-4'>Esta demostración envía tus mensajes y archivos al servicio Dify para generar respuestas y conservar el historial asociado a una cookie de sesión. No compartas contraseñas, datos bancarios ni información sensible. Las solicitudes de cita requieren confirmación del salón; el asistente puede cometer errores.</p>
    <p className='mb-4'>This demo sends messages and uploaded files to Dify to generate replies and maintain history linked to a session cookie. Do not share passwords, banking details or sensitive information. Appointment requests require confirmation from the salon; the assistant can make mistakes.</p>
    <p className='mb-4'>El selector de idioma usa una cookie de preferencia. No hay pagos en esta web. Antes de operar con clientes reales, el responsable del salón debe publicar su identidad, contacto, plazos de conservación y procedimiento para ejercer derechos o solicitar eliminación de datos.</p>
    <p className='mb-4'>The language selector stores a preference cookie. This website does not take payments. Before serving real customers, the salon operator must publish their identity, contact details, retention periods and a process for privacy rights and deletion requests.</p>
    <Link href='/' className='underline'>Volver al asistente · Back to assistant</Link>
  </main>
}
