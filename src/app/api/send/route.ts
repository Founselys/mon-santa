import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { emails } = await req.json();
    // Utilise l'URL de ton projet Vercel ici si tu es en ligne
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const results = await Promise.all(
      emails.map((item: any) =>
        resend.emails.send({
          from: 'Secret Santa <onboarding@resend.dev>',
          to: item.to,
          subject: `Secret Santa : Ton tirage pour ${item.groupName} ! 🎅`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; padding: 40px; border-radius: 20px; text-align: center;">
              <h1 style="color: #e11d48; font-weight: 900;">Salut ${item.name} !</h1>
              
              <div style="background-color: #fff1f2; padding: 20px; border-radius: 15px; margin: 20px 0;">
                <p style="color: #e11d48; text-transform: uppercase; font-weight: bold; margin: 0;">Tu dois offrir à :</p>
                <p style="font-size: 28px; color: #9f1239; font-weight: 900; margin: 10px 0;">${item.targetName}</p>
              </div>

              <div style="margin: 30px 0;">
                <a href="${baseUrl}/wishlist/${item.groupId}?u=${item.participantId}" 
                   style="background-color: #e11d48; color: white; padding: 15px 25px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">
                   Voir ma mission secrète
                </a>
              </div>
              
              <p style="font-size: 12px; color: #94a3b8;">
                Ce lien te permet de voir les idées de ${item.targetName} et de gérer TA propre liste.
              </p>
            </div>
          `
        })
      )
    );

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: "Erreur d'envoi" }, { status: 500 });
  }
}