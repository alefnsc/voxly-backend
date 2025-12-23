/**
 * Email Template Service v1.0
 * 
 * Branded HTML email templates with localization support.
 * Clean, professional design matching Vocaid branding.
 */

import { StructuredFeedback } from '../types/feedback';

// ============================================
// LOCALIZATION
// ============================================

export type EmailLocale = 'en' | 'es' | 'pt' | 'zh' | 'hi' | 'ja' | 'ko' | 'de' | 'fr' | 'it';

interface EmailStrings {
  subject: string;
  preheader: string;
  greeting: string;
  scoreLabel: string;
  scoreLabelExcellent: string;
  scoreLabelGood: string;
  scoreLabelFair: string;
  scoreLabelNeedsWork: string;
  summaryTitle: string;
  ctaButton: string;
  attachmentNotice: string;
  footerReason: string;
  footerSupport: string;
  footerUnsubscribe: string;
  copyright: string;
}

const EMAIL_STRINGS: Record<EmailLocale, EmailStrings> = {
  en: {
    subject: 'Your interview feedback report is ready',
    preheader: 'Scorecard, highlights, and a study plan attached.',
    greeting: 'Hi',
    scoreLabel: 'Your Score',
    scoreLabelExcellent: 'Excellent',
    scoreLabelGood: 'Good',
    scoreLabelFair: 'Fair',
    scoreLabelNeedsWork: 'Needs Improvement',
    summaryTitle: 'Quick Summary',
    ctaButton: 'View Full Report',
    attachmentNotice: 'Your complete feedback report is attached as a PDF.',
    footerReason: "You're receiving this because you completed an interview practice session on Vocaid.",
    footerSupport: 'Need help? Contact us at support@vocaid.ai',
    footerUnsubscribe: 'Manage email preferences',
    copyright: '© 2024 Vocaid. All rights reserved.'
  },
  es: {
    subject: 'Tu informe de retroalimentación está listo',
    preheader: 'Puntuación, aspectos destacados y plan de estudio adjuntos.',
    greeting: 'Hola',
    scoreLabel: 'Tu Puntuación',
    scoreLabelExcellent: 'Excelente',
    scoreLabelGood: 'Bueno',
    scoreLabelFair: 'Regular',
    scoreLabelNeedsWork: 'Necesita Mejorar',
    summaryTitle: 'Resumen Rápido',
    ctaButton: 'Ver Informe Completo',
    attachmentNotice: 'Tu informe completo está adjunto como PDF.',
    footerReason: 'Recibes este correo porque completaste una sesión de práctica en Vocaid.',
    footerSupport: '¿Necesitas ayuda? Contáctanos en support@vocaid.ai',
    footerUnsubscribe: 'Gestionar preferencias de correo',
    copyright: '© 2024 Vocaid. Todos los derechos reservados.'
  },
  pt: {
    subject: 'Seu relatório de feedback está pronto',
    preheader: 'Pontuação, destaques e plano de estudos em anexo.',
    greeting: 'Olá',
    scoreLabel: 'Sua Pontuação',
    scoreLabelExcellent: 'Excelente',
    scoreLabelGood: 'Bom',
    scoreLabelFair: 'Regular',
    scoreLabelNeedsWork: 'Precisa Melhorar',
    summaryTitle: 'Resumo Rápido',
    ctaButton: 'Ver Relatório Completo',
    attachmentNotice: 'Seu relatório completo está anexado como PDF.',
    footerReason: 'Você está recebendo isso porque completou uma sessão de prática no Vocaid.',
    footerSupport: 'Precisa de ajuda? Entre em contato em support@vocaid.ai',
    footerUnsubscribe: 'Gerenciar preferências de email',
    copyright: '© 2024 Vocaid. Todos os direitos reservados.'
  },
  zh: {
    subject: '您的面试反馈报告已准备就绪',
    preheader: '评分卡、亮点和学习计划已附上。',
    greeting: '您好',
    scoreLabel: '您的得分',
    scoreLabelExcellent: '优秀',
    scoreLabelGood: '良好',
    scoreLabelFair: '一般',
    scoreLabelNeedsWork: '需要改进',
    summaryTitle: '快速摘要',
    ctaButton: '查看完整报告',
    attachmentNotice: '您的完整反馈报告已作为PDF附件发送。',
    footerReason: '您收到此邮件是因为您在Vocaid上完成了一次面试练习。',
    footerSupport: '需要帮助？请联系 support@vocaid.ai',
    footerUnsubscribe: '管理邮件偏好',
    copyright: '© 2024 Vocaid. 保留所有权利。'
  },
  hi: {
    subject: 'आपकी साक्षात्कार प्रतिक्रिया रिपोर्ट तैयार है',
    preheader: 'स्कोरकार्ड, मुख्य बिंदु और अध्ययन योजना संलग्न।',
    greeting: 'नमस्ते',
    scoreLabel: 'आपका स्कोर',
    scoreLabelExcellent: 'उत्कृष्ट',
    scoreLabelGood: 'अच्छा',
    scoreLabelFair: 'ठीक',
    scoreLabelNeedsWork: 'सुधार की आवश्यकता',
    summaryTitle: 'त्वरित सारांश',
    ctaButton: 'पूरी रिपोर्ट देखें',
    attachmentNotice: 'आपकी पूरी प्रतिक्रिया रिपोर्ट PDF के रूप में संलग्न है।',
    footerReason: 'आपको यह इसलिए प्राप्त हो रहा है क्योंकि आपने Vocaid पर एक साक्षात्कार अभ्यास सत्र पूरा किया।',
    footerSupport: 'मदद चाहिए? support@vocaid.ai पर संपर्क करें',
    footerUnsubscribe: 'ईमेल प्राथमिकताएं प्रबंधित करें',
    copyright: '© 2024 Vocaid. सर्वाधिकार सुरक्षित।'
  },
  ja: {
    subject: '面接フィードバックレポートの準備ができました',
    preheader: 'スコアカード、ハイライト、学習プランを添付。',
    greeting: 'こんにちは',
    scoreLabel: 'あなたのスコア',
    scoreLabelExcellent: '優秀',
    scoreLabelGood: '良好',
    scoreLabelFair: '普通',
    scoreLabelNeedsWork: '改善が必要',
    summaryTitle: 'クイックサマリー',
    ctaButton: 'レポート全文を見る',
    attachmentNotice: '完全なフィードバックレポートをPDFとして添付しました。',
    footerReason: 'Vocaidで面接練習セッションを完了したため、このメールを受け取っています。',
    footerSupport: 'ヘルプが必要ですか？support@vocaid.aiにお問い合わせください',
    footerUnsubscribe: 'メール設定を管理',
    copyright: '© 2024 Vocaid. All rights reserved.'
  },
  ko: {
    subject: '면접 피드백 보고서가 준비되었습니다',
    preheader: '점수표, 하이라이트 및 학습 계획이 첨부되었습니다.',
    greeting: '안녕하세요',
    scoreLabel: '당신의 점수',
    scoreLabelExcellent: '우수',
    scoreLabelGood: '양호',
    scoreLabelFair: '보통',
    scoreLabelNeedsWork: '개선 필요',
    summaryTitle: '빠른 요약',
    ctaButton: '전체 보고서 보기',
    attachmentNotice: '전체 피드백 보고서가 PDF로 첨부되었습니다.',
    footerReason: 'Vocaid에서 면접 연습 세션을 완료했기 때문에 이 이메일을 받고 있습니다.',
    footerSupport: '도움이 필요하신가요? support@vocaid.ai로 문의하세요',
    footerUnsubscribe: '이메일 환경설정 관리',
    copyright: '© 2024 Vocaid. All rights reserved.'
  },
  de: {
    subject: 'Ihr Interview-Feedback-Bericht ist bereit',
    preheader: 'Scorecard, Highlights und Studienplan im Anhang.',
    greeting: 'Hallo',
    scoreLabel: 'Ihre Punktzahl',
    scoreLabelExcellent: 'Ausgezeichnet',
    scoreLabelGood: 'Gut',
    scoreLabelFair: 'Befriedigend',
    scoreLabelNeedsWork: 'Verbesserung nötig',
    summaryTitle: 'Kurzübersicht',
    ctaButton: 'Vollständigen Bericht ansehen',
    attachmentNotice: 'Ihr vollständiger Feedback-Bericht ist als PDF angehängt.',
    footerReason: 'Sie erhalten diese E-Mail, weil Sie eine Interview-Übungssitzung auf Vocaid abgeschlossen haben.',
    footerSupport: 'Hilfe benötigt? Kontaktieren Sie uns unter support@vocaid.ai',
    footerUnsubscribe: 'E-Mail-Einstellungen verwalten',
    copyright: '© 2024 Vocaid. Alle Rechte vorbehalten.'
  },
  fr: {
    subject: 'Votre rapport de feedback est prêt',
    preheader: 'Scorecard, points forts et plan d\'étude en pièce jointe.',
    greeting: 'Bonjour',
    scoreLabel: 'Votre Score',
    scoreLabelExcellent: 'Excellent',
    scoreLabelGood: 'Bon',
    scoreLabelFair: 'Passable',
    scoreLabelNeedsWork: 'À améliorer',
    summaryTitle: 'Résumé Rapide',
    ctaButton: 'Voir le Rapport Complet',
    attachmentNotice: 'Votre rapport complet est joint en PDF.',
    footerReason: 'Vous recevez cet email car vous avez terminé une session de pratique sur Vocaid.',
    footerSupport: 'Besoin d\'aide ? Contactez-nous à support@vocaid.ai',
    footerUnsubscribe: 'Gérer les préférences email',
    copyright: '© 2024 Vocaid. Tous droits réservés.'
  },
  it: {
    subject: 'Il tuo report di feedback è pronto',
    preheader: 'Scorecard, punti di forza e piano di studio allegati.',
    greeting: 'Ciao',
    scoreLabel: 'Il Tuo Punteggio',
    scoreLabelExcellent: 'Eccellente',
    scoreLabelGood: 'Buono',
    scoreLabelFair: 'Discreto',
    scoreLabelNeedsWork: 'Da migliorare',
    summaryTitle: 'Riepilogo Rapido',
    ctaButton: 'Vedi Report Completo',
    attachmentNotice: 'Il tuo report completo è allegato come PDF.',
    footerReason: 'Ricevi questa email perché hai completato una sessione di pratica su Vocaid.',
    footerSupport: 'Hai bisogno di aiuto? Contattaci a support@vocaid.ai',
    footerUnsubscribe: 'Gestisci preferenze email',
    copyright: '© 2024 Vocaid. Tutti i diritti riservati.'
  }
};

// ============================================
// TYPES
// ============================================

export interface EmailTemplateParams {
  candidateName: string;
  score: number;
  summary: string;
  roleTitle: string;
  reportUrl: string;
  locale?: EmailLocale;
}

export interface GeneratedEmail {
  subject: string;
  html: string;
  text: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getScoreLabel(score: number, strings: EmailStrings): string {
  if (score >= 80) return strings.scoreLabelExcellent;
  if (score >= 60) return strings.scoreLabelGood;
  if (score >= 40) return strings.scoreLabelFair;
  return strings.scoreLabelNeedsWork;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#16a34a'; // green-600
  if (score >= 60) return '#581c87'; // purple-600
  if (score >= 40) return '#ca8a04'; // yellow-600
  return '#dc2626'; // red-600
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// HTML TEMPLATE
// ============================================

function generateHtmlEmail(params: EmailTemplateParams, strings: EmailStrings): string {
  const { candidateName, score, summary, roleTitle, reportUrl } = params;
  const scoreLabel = getScoreLabel(score, strings);
  const scoreColor = getScoreColor(score);
  
  return `<!DOCTYPE html>
<html lang="${params.locale || 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(strings.subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f4f4f5;
    }
    /* Typography */
    .body-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #3f3f46;
    }
    .heading {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-weight: 700;
      color: #18181b;
    }
    /* Button */
    .cta-button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #581c87;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      border-radius: 8px;
    }
    .cta-button:hover {
      background-color: #6b21a8;
    }
    /* Score badge */
    .score-badge {
      display: inline-block;
      width: 80px;
      height: 80px;
      line-height: 80px;
      border-radius: 50%;
      text-align: center;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
    }
    /* Footer */
    .footer-text {
      font-size: 13px;
      color: #71717a;
    }
    .footer-link {
      color: #581c87;
      text-decoration: none;
    }
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .score-badge {
        width: 60px;
        height: 60px;
        line-height: 60px;
        font-size: 22px;
      }
    }
  </style>
</head>
<body>
  <!-- Hidden preheader text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${escapeHtml(strings.preheader)}
    &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Main container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header with accent bar -->
          <tr>
            <td style="background-color: #581c87; height: 6px;"></td>
          </tr>
          
          <!-- Logo and greeting -->
          <tr>
            <td style="padding: 32px 40px 24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px;" class="heading">Vocaid</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 24px;">
                    <p class="body-text" style="margin: 0;">
                      ${escapeHtml(strings.greeting)} ${escapeHtml(candidateName)},
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Score section -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafafa; border-radius: 8px; padding: 24px;">
                <tr>
                  <td width="100" align="center" valign="top" style="padding: 16px;">
                    <div class="score-badge" style="background-color: ${scoreColor};">
                      ${score}%
                    </div>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #71717a;">${escapeHtml(strings.scoreLabel)}</p>
                  </td>
                  <td valign="middle" style="padding: 16px;">
                    <h2 class="heading" style="margin: 0 0 4px 0; font-size: 18px; color: ${scoreColor};">
                      ${escapeHtml(scoreLabel)}
                    </h2>
                    <p style="margin: 0; font-size: 14px; color: #71717a;">
                      ${escapeHtml(roleTitle)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Summary section -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <h3 class="heading" style="margin: 0 0 12px 0; font-size: 16px; color: #581c87;">
                ${escapeHtml(strings.summaryTitle)}
              </h3>
              <p class="body-text" style="margin: 0;">
                ${escapeHtml(summary)}
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <a href="${escapeHtml(reportUrl)}" class="cta-button" target="_blank">
                ${escapeHtml(strings.ctaButton)}
              </a>
            </td>
          </tr>
          
          <!-- Attachment notice -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #faf5ff; border-left: 4px solid #581c87; padding: 12px 16px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 14px; color: #581c87;">
                      ${escapeHtml(strings.attachmentNotice)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f4f4f5; border-top: 1px solid #e4e4e7;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="footer-text" style="padding-bottom: 12px;">
                    ${escapeHtml(strings.footerReason)}
                  </td>
                </tr>
                <tr>
                  <td class="footer-text" style="padding-bottom: 12px;">
                    ${escapeHtml(strings.footerSupport)}
                  </td>
                </tr>
                <tr>
                  <td class="footer-text">
                    <a href="${escapeHtml(reportUrl.replace('/feedback', '/settings'))}" class="footer-link">
                      ${escapeHtml(strings.footerUnsubscribe)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td class="footer-text" style="padding-top: 16px; text-align: center;">
                    ${escapeHtml(strings.copyright)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// PLAIN TEXT TEMPLATE
// ============================================

function generateTextEmail(params: EmailTemplateParams, strings: EmailStrings): string {
  const { candidateName, score, summary, roleTitle, reportUrl } = params;
  const scoreLabel = getScoreLabel(score, strings);
  
  return `${strings.greeting} ${candidateName},

${strings.scoreLabel}: ${score}% - ${scoreLabel}
${roleTitle}

${strings.summaryTitle}
${summary}

${strings.ctaButton}: ${reportUrl}

${strings.attachmentNotice}

---
${strings.footerReason}
${strings.footerSupport}

${strings.copyright}`;
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class EmailTemplateService {
  /**
   * Generate a complete feedback email with HTML and plain text versions
   */
  generateFeedbackEmail(params: EmailTemplateParams): GeneratedEmail {
    const locale = params.locale || 'en';
    const strings = EMAIL_STRINGS[locale] || EMAIL_STRINGS['en'];
    
    return {
      subject: strings.subject,
      html: generateHtmlEmail(params, strings),
      text: generateTextEmail(params, strings)
    };
  }
  
  /**
   * Get email subject for a locale
   */
  getSubject(locale: EmailLocale = 'en'): string {
    const strings = EMAIL_STRINGS[locale] || EMAIL_STRINGS['en'];
    return strings.subject;
  }
  
  /**
   * Get all supported locales
   */
  getSupportedLocales(): EmailLocale[] {
    return Object.keys(EMAIL_STRINGS) as EmailLocale[];
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const emailTemplateService = new EmailTemplateService();
