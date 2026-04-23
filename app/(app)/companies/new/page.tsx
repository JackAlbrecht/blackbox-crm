import { CompanyNewForm } from './CompanyNewForm';

export const metadata = { title: 'New company · Blackbox CRM' };

export default function NewCompanyPage() {
  return (
    <div className="max-w-3xl animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">New company</h1>
        <p className="mt-1 text-sm text-gray-400">
          Create a company record. Contacts can be linked to it from the contact page or from /companies/[id].
        </p>
      </header>
      <div className="card p-6">
        <CompanyNewForm />
      </div>
    </div>
  );
}
