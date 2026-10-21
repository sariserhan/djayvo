import {ContactForm} from '../contact/form';
export const dynamic='force-dynamic';
export const metadata={title:'Jamloom Support'};
export default function Support(){return <section className="product-document"><p className="eyebrow">We’re here to help</p><h1>Get support</h1><p>Tell us what happened, the page you were using and your device or browser. Include a previous ticket reference if you are following up.</p><ContactForm kind="support"/><p>You can also email <a href="mailto:support@jamloom.com">support@jamloom.com</a>.</p></section>;}
