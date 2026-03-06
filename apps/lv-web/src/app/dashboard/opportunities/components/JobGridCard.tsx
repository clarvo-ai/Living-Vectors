'use client';

import { Job, displayMaps } from '@/types/job';
import { Badge } from '@repo/ui/components/badge';
import { MapPin } from 'lucide-react';

interface JobGridCardProps {
  job: Job;
  onClick: () => void;
  /** When true, shows a small "Seen" pill on the card */
  isViewed?: boolean;
}

export function JobGridCard({ job, onClick, isViewed = false }: JobGridCardProps) {
  const location = job.city
    ? job.country
      ? `${job.city}, ${job.country}`
      : job.city
    : job.country || null;

  const formatWorkingMode = (mode?: string | null) => {
    if (!mode) return '';
    return displayMaps.working_mode[mode.toLowerCase()] || mode;
  };

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return '';
    const roundToTens = (num: number) => Math.round(num / 10) * 10;
    if (min && max) {
      return `${roundToTens(min).toLocaleString()} – ${roundToTens(max).toLocaleString()} €/month`;
    }
    if (min) return `From ${roundToTens(min).toLocaleString()} €/month`;
    if (max) return `Up to ${roundToTens(max).toLocaleString()} €/month`;
    return '';
  };

  const getSalaryDisplay = () => {
    const hasActualSalary = !!(job.salary_min || job.salary_max);
    const hasGuessedSalary = !!(
      job.guessed_salary ||
      job.guessed_salary_min ||
      job.guessed_salary_max
    );
    if (hasActualSalary) {
      return { salary: formatSalary(job.salary_min, job.salary_max), isEstimate: false };
    }
    if (hasGuessedSalary) {
      return {
        salary: formatSalary(job.guessed_salary_min || job.guessed_salary, job.guessed_salary_max),
        isEstimate: true,
      };
    }
    return { salary: '', isEstimate: false };
  };

  const salaryInfo = getSalaryDisplay();
  const industry = job.company_industry || job.role_industry || null;

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all duration-200"
    >
      {/* Company & Industry + Seen pill */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{job.company_name}</p>
          {industry && <p className="text-sm text-gray-500 mt-0.5">{industry}</p>}
        </div>
        {isViewed && (
          <span className="shrink-0 text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            Seen
          </span>
        )}
      </div>

      {/* Job Title */}
      <div className="mb-3">
        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
          {job.job_title}
        </h3>
      </div>

      {/* Location & Work Mode */}
      <div className="flex items-center gap-3 text-sm text-gray-500 mb-4 flex-wrap">
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
        )}
        {job.working_mode && <span>{formatWorkingMode(job.working_mode)}</span>}
      </div>

      {/* Skills */}
      {job.required_skills && job.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.required_skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="outline" className="text-xs font-normal text-gray-600">
              {skill}
            </Badge>
          ))}
          {job.required_skills.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal text-gray-400">
              +{job.required_skills.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Salary */}
      {salaryInfo.salary && (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{salaryInfo.salary}</span>
        </div>
      )}
    </div>
  );
}
