import { Routes} from '@angular/router';
import {DashboardComponent} from "./Dynamic/homepage/homepage-dashboard/dashboard.component";
import {AboutUsDashboardComponent} from "./Dynamic/about-us/about-us-dashboard/about-us-dashboard.component";
import {ContactDashboardComponent} from "./Dynamic/contact/contact-dashboard/contact-dashboard.component";
import {UnderConstructionComponent} from "./Dynamic/under-construction/under-construction.component";
import {
  DienstleistungDashboardComponent
} from "./Dynamic/dienstleistung/dienstleistung-dashboard/dienstleistung-dashboard.component";
import {ImpressumComponent} from "./Dynamic/impressum/impressum.component";
import {DatenschutzerklaerungComponent} from "./Dynamic/datenschutzerklaerung/datenschutzerklaerung.component";
import {HomepageStartseiteComponent} from "./Dynamic/homepage/homepage-startseite/homepage-startseite.component";
import {AgbComponent} from "./Dynamic/agb/agb.component";
import {AdminLoginComponent} from "./Dynamic/admin-section/admin-dashboard/admin-login/admin-login.component";
import {adminGuard, authGuard} from "./Services/AuthService/auth.guard";
import {AdminDashboardComponent} from "./Dynamic/admin-section/admin-dashboard/admin-dashboard.component";
import {AdminLivechatComponent} from "./Dynamic/admin-section/admin-livechat/admin-livechat.component";
import {BookingListComponent} from "./Dynamic/admin-section/admin-dashboard/booking-list/booking-list.component";
import {
  BookingDetailComponent
} from "./Dynamic/admin-section/admin-dashboard/booking-list/booking-detail/booking-detail.component";
import {
  ChatbotResponseInsertComponent
} from "./Dynamic/admin-section/admin-dashboard/chatbot-response-insert/chatbot-response-insert.component";


export const routes: Routes = [
  { path: '',
    pathMatch: 'full',
    component: DashboardComponent,
    data: {
      title: 'YISU Travel GmbH',
      description: 'YISU Travel GmbH ist ein kompetenter und vertrauenswürdiger Ansprechpartner für unvergessliche Urlaubsreisen mit der Familie sowie für professionelle Geschäftsreisen in Hanau. Unser Büro befindet sich in der Schnurstraße 15, 63450 Hanau, direkt in der Hanauer Innenstadt. YISU Travel GmbH ist ein Reisebüro, das sich auf maßgeschneiderte Reisen spezialisiert hat. Wir bieten umfassende Reiseberatung, individuelle Angebote und einen persönlichen Service, um Ihre Traumreise zu verwirklichen. Besuchen Sie uns in Hanau oder kontaktieren Sie uns online für Ihr persönliches Reiseerlebnis. Vertrauen Sie auf unsere Expertise und genießen Sie einen stressfreien Urlaub, während wir uns um alle Details kümmern. Wir von YISU Travel GmbH in Hanau sind immer bereit, euch zu unterstützen und einen schönen Urlaub zu ermöglichen. Schnurstraße 15, 63450 Hanau ist unsere Adresse. Wir freuen uns über Ihren Besuch und helfen euch gerne bei euren Problemen weiter. Egal ob Flug Buchung, Mietwagen, Yacht, wir helfen wo wir können. YISU Travel GmbH Ist für euch da.',
      keywords: 'YISU Travel GmbH,reisebüro,hanau,reiseberatung,urlaub',
      ogUrl: 'https://yisu-travel.de',
      author: 'YISU Travel GmbH',
      canonical: 'https://yisu-travel.de'
    }
  },
  {
    path: 'ueber-uns',
    component: AboutUsDashboardComponent,
    data: {
      title: 'Über Uns - YISU Travel GmbH',
      description: 'Ich bin Yigit Sevgi. Gemeinsam mit meinem Onkel haben wir YISU Travel GmbH gegründet. Mit über 10 Jahren Erfahrung in der Reisebranche sind wir stolz darauf, ein zuverlässiger Partner für unsere Kunden zu sein. Unsere Reiseagentur hat sich aus einer gemeinsamen Leidenschaft für das Reisen und dem Wunsch entwickelt, unvergessliche Erlebnisse zu schaffen. Trotz zahlreicher Herausforderungen und Hindernisse haben wir nie aufgegeben und sind zusammen gewachsen. Unsere persönliche Verbindung und unser Engagement für Qualität zeichnen uns aus. Wir glauben, dass jede Reise einzigartig ist und jeder Kunde individuelle Bedürfnisse hat. Unser Ziel ist es, Ihnen maßgeschneiderte Reisen zu bieten, sei es für den perfekten Familienurlaub oder für geschäftliche Anlässe. Mit YISU Travel GmbH sind Sie in guten Händen – lassen Sie uns Ihre nächsten Abenteuer planen!',
      keywords: 'YISU Travel GmbH,über Uns,ferien,reisewelt,geschichte',
      ogUrl: 'https://yisu-travel.de/ueber-uns',
      author: 'YISU Travel GmbH',
      canonical: 'https://yisu-travel.de/ueber-uns'
    }
  },
  {
    path: 'kontakt',
    component: ContactDashboardComponent,
    data: {
      title: 'Kontakt - YISU Travel GmbH',
      description: 'Bei YISU Travel GmbH stehen Ihre Wünsche und Bedürfnisse im Mittelpunkt. Wir sind ein offenes und flexibles Team, das sich darauf freut, Ihnen bei der Planung Ihrer nächsten Reise zu helfen. Egal, ob Sie eine Frage zu unseren Dienstleistungen haben oder individuelle Beratung benötigen – wir sind für Sie da! Unsere Experten sind stets bereit, Ihre Anfragen schnell und kompetent zu bearbeiten. Wir unterstützen Sie bei der Auswahl der perfekten Reiseziele und erstellen maßgeschneiderte Angebote, die auf Ihre Wünsche abgestimmt sind. Zögern Sie nicht, uns zu kontaktieren! Wir freuen uns über jede Kontaktaufnahme und stehen Ihnen jederzeit zur Verfügung, um Ihre Fragen zu beantworten oder Ihnen bei der Planung Ihrer nächsten unvergesslichen Reise zu helfen. Ihr Traumurlaub ist nur eine Nachricht entfernt!',
      keywords: 'YISU Travel GmbH,kontaktieren,kundenservice,anfragen,kontaktaufnahme',
      ogUrl: 'https://yisu-travel.de/kontakt',
      author: 'YISU Travel GmbH',
      canonical: 'https://yisu-travel.de/kontakt'
    }
  },
  {
    path: 'in-bearbeitung',
    component: UnderConstructionComponent,
    data: {
      title: 'In Bearbeitung - YISU Travel GmbH',
      description: 'Herzlich willkommen bei YISU Travel GmbH! Unsere Website befindet sich momentan noch in Bearbeitung, und wir arbeiten daran, Ihnen ein verbessertes Nutzererlebnis zu bieten. Vielen Dank für Ihre Geduld und Ihr Verständnis während dieser Zeit. Bald werden Sie viele spannende Informationen, Angebote und Reiseideen entdecken können, die auf Ihre individuellen Bedürfnisse zugeschnitten sind. Unser Team ist bestrebt, Ihnen den besten Service zu bieten und Ihre Reiseplanung so einfach und angenehm wie möglich zu gestalten. Bleiben Sie dran! Wir freuen uns darauf, Ihnen bald unsere neuen Inhalte und Angebote präsentieren zu können. Wenn Sie Fragen haben oder mit uns in Kontakt treten möchten, zögern Sie bitte nicht, uns direkt zu kontaktieren.',
      keywords: 'YISU Travel GmbH,aufbau,bearbeitung,neuer inhalt',
      ogUrl: 'https://yisu-travel.de/in-bearbeitung',
      author: 'YISU Travel GmbH',
      canonical: 'https://yisu-travel.de/in-bearbeitung'
    }
  },
  {
    path: 'dienstleistung',
    component: DienstleistungDashboardComponent,
    data: {
      title: 'Dienstleistung - YISU Travel GmbH',
      description: 'Wir bieten Ihnen bei YISU Travel GmbH eine umfassende Palette an Reiseleistungen, die darauf abzielen, Ihre Reiseerfahrung unvergesslich zu machen. Egal, ob Sie einen Flug buchen, ein komfortables Hotel finden oder ein Visum benötigen – wir sind für Sie da! Unsere kompetenten Berater unterstützen Sie bei der Planung Ihrer perfekten Reise, sei es eine entspannende Kreuzfahrt, ein flexibler Mietwagen für Ihre Erkundungen oder eine Pauschalreise, die alles beinhaltet. Darüber hinaus empfehlen wir Ihnen, eine Reiserücktrittsversicherung abzuschließen, um sich gegen unvorhergesehene Ereignisse abzusichern. Bei YISU Travel GmbH legen wir großen Wert auf Ihre Zufriedenheit und möchten sicherstellen, dass Ihre Reise reibungslos verläuft. Lassen Sie sich von uns beraten und profitieren Sie von unserem umfangreichen Netzwerk und unserer Expertise. Kontaktieren Sie uns noch heute, um Ihre nächste Traumreise zu planen!',
      keywords: 'YISU Travel GmbH,dienstleistung,flugbuchung,kreuzfahrten,reiserücktrittsversicherung,visum,mietwagen,pauschalreise,hotel',
      ogUrl: 'https://yisu-travel.de/dienstleistung',
      author: 'YISU Travel GmbH',
      canonical: 'https://yisu-travel.de/dienstleistung'
    }
  },
  {
    path: 'impressum',
    component: ImpressumComponent,
    data: {
      title: 'Impressum - YISU Travel GmbH',
      description: 'Bei YISU Travel GmbH sind wir bestrebt, unseren Kunden die besten Reiseerlebnisse zu bieten. Für Anfragen oder Informationen zu unseren Dienstleistungen können Sie uns jederzeit über die oben angegebenen Kontaktdaten erreichen. Wir legen großen Wert auf Kundenzufriedenheit und stehen Ihnen gerne zur Verfügung, um Ihre Fragen zu beantworten oder individuelle Reiseangebote zu erstellen. Ihre Rückmeldungen sind uns wichtig, da sie uns helfen, unseren Service stetig zu verbessern. Bitte zögern Sie nicht, uns zu kontaktieren – wir freuen uns auf Ihre Nachricht!',
      keywords: 'YISU Travel GmbH,impressum,rechtliches,reiserechtliches,unternehmensinformation',
      ogUrl: 'https://yisu-travel.de/impressum',
      author: 'YISU Travel GmbH',
      canonical: 'https://yisu-travel.de/impressum'
    }
  },
  {
    path: 'datenschutzerklaerung',
    component: DatenschutzerklaerungComponent,
    data: {
      title: 'Datenschutzerklärung - YISU Travel GmbH',
      description: 'Bei YISU Travel GmbH nehmen wir den Schutz Ihrer Daten sehr ernst. Ihre Privatsphäre ist uns wichtig, und wir setzen alles daran, Ihre persönlichen Informationen zu schützen. In unserer Datenschutzerklärung informieren wir Sie darüber, welche Daten wir sammeln, wie wir sie verwenden und welche Rechte Sie in Bezug auf Ihre Daten haben. Wir erheben nur die Daten, die für die Bearbeitung Ihrer Anfragen und zur Verbesserung unserer Dienstleistungen notwendig sind. Darüber hinaus gewährleisten wir, dass Ihre Daten vertraulich behandelt und nicht an Dritte weitergegeben werden, es sei denn, dies ist zur Erfüllung Ihrer Anfrage erforderlich oder gesetzlich vorgeschrieben. Sie haben jederzeit das Recht, Auskunft über Ihre bei uns gespeicherten Daten zu erhalten, diese zu berichtigen oder zu löschen. Bei Fragen zur Datenverarbeitung oder zur Wahrnehmung Ihrer Rechte stehen wir Ihnen gerne zur Verfügung. Ihre Zufriedenheit und Ihr Vertrauen sind uns wichtig!',
      keywords: 'YISU Travel GmbH,datenschutzerklärung,datensicherheit,datenverarbeitung,personenbezogene daten',
      ogUrl: 'https://yisu-travel.de/datenschutzerklaerung',
      author: 'YISU Travel GmbH',
      canonical: 'https://yisu-travel.de/datenschutzerklaerung'
    }
  },
  {
    path: 'agb',
    component: AgbComponent,
    data: {
      title: 'AGB - YISU Travel GmbH',
      description: 'Hier finden Sie unsere Allgemeine Geschäftsbedingung von YISU Travel GmbH. Die AGB enthält alle wichtigen Informationen und Richtlinien, die für die Nutzung unserer Website und die Inanspruchnahme unserer Dienstleistungen gelten. Unsere AGB enthalten Details zu Themen wie Buchungsprozessen, Zahlungsbedingungen, Stornierungsrichtlinien und Haftungsbeschränkungen. Wir legen großen Wert auf Transparenz und möchten, dass Sie stets gut informiert sind, bevor Sie eine Reise mit uns planen. Bitte nehmen Sie sich einen Moment Zeit, um unsere Bedingungen sorgfältig durchzulesen, um Missverständnisse zu vermeiden und Ihre Reise optimal zu gestalten. Sollten Sie Fragen oder Anliegen zu unseren Geschäftsbedingungen haben, stehen wir Ihnen jederzeit gerne zur Verfügung. Unsere AGB werden regelmäßig aktualisiert, um Ihnen stets den besten Service zu bieten und gesetzlichen Anforderungen zu entsprechen. Vielen Dank, dass Sie sich für unsere Agentur entschieden haben.',
      keywords: 'YISU Travel GmbH,allgemeine geschäftsbedingung,agb,stornierungsbedingungen,reisebuchung',
      ogUrl: 'https://yisu-travel.de/agb',
      author: 'YISU Travel GmbH',
      canonical: 'https://yisu-travel.de/agb'
    }
  },
  {
    path: 'startseite',
    component: HomepageStartseiteComponent,
    data: {
      title: 'Alte Startseite',
    }
  },
  {
    path: 'admin-login',
    component: AdminLoginComponent
  },
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin-livechat',
    component: AdminLivechatComponent
  },
  {
    path: 'admin/buchungsliste',
    component: BookingListComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'admin/buchungsliste/:id',
    component: BookingDetailComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'admin/chatbot-trainieren',
    component: ChatbotResponseInsertComponent,
    canActivate: [adminGuard]
  },
  {
    path: '**', redirectTo: ''
  },
];
