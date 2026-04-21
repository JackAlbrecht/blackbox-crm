import { ContactForm } from '@/components/forms/ContactForm';

export const metadata = { title: 'New contact · Blackbox CRM' };

export default function NewContactPage() {
  return (
    <div className="max-w-2xl animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New contact</h1>
        <p className="mt-1 text-sm text-gray-400">Add someone to your CRM.</p>
      </header>
      <div className="card p-6">
        <ContactForm />
      </div>
    </div>
  );
}
