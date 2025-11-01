import dynamic from 'next/dynamic';

const ProfileSection = dynamic(
  () => import('../../components/ui/ProfileSection'),
  { ssr: false }
);

export default function Page() {
  return <div><ProfileSection></ProfileSection></div>;
}
