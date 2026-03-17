import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, targetName, groupName } = await req.json();

    const { error } = await resend.emails.send({
      from: 'Secret Santa <noreply@founselys.com>', // Utilise la même adresse que ton autre fichier
      to: [to],
      subject: `Secret Santa - Quelqu'un a besoin d'aide ! 🎅`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; border: 4px solid #0f172a; border-radius: 16px;">
            <h2 style="color: #dc2626; font-style: italic; text-transform: uppercase;">Coucou ${targetName} ! 🎄</h2>
            <p style="font-size: 16px;">Ton Père Noël secret dans le groupe <strong>${groupName}</strong> se gratte la tête...</p>
            <p style="font-size: 16px;">Il ne sait vraiment pas quoi t'offrir car ta liste de cadeaux est vide (ou presque) !</p>
            <p style="font-size: 16px;">N'hésite pas à te connecter sur <strong>founselys.com</strong> et à ajouter quelques idées pour l'aider à garder la surprise.</p>
            <p style="font-size: 16px; margin-top: 30px; font-weight: bold;">Joyeuses fêtes ! 🎁</p>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}