'use client';

import { Job, displayMaps } from '@/types/job';
import { Badge } from '@repo/ui/components/badge';
import { Card, CardContent, CardHeader } from '@repo/ui/components/card';
import { Briefcase, Building2, CircleDollarSign, MapPin, Sparkles } from 'lucide-react';

interface JobGridCardProps {
  job: Job;
  onClick: () => void;
}

export function JobGridCard({ job, onClick }: JobGridCardProps) {
  const location = job.city
    ? `${job.city}, ${job.country}`
    : job.country || 'Location not specified';
  const showRoleIndustry = job.role_industry && job.role_industry !== job.company_industry;

  const formatWorkingMode = (mode?: string | null) => {
    if (!mode) return '';
    return displayMaps.working_mode[mode.toLowerCase()] || mode;
  };

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return '';
    const roundToTens = (num: number) => Math.round(num / 10) * 10;
    if (min && max) {
      return `€${roundToTens(min).toLocaleString()} - €${roundToTens(max).toLocaleString()}`;
    }
    if (min) return `From €${roundToTens(min).toLocaleString()}`;
    if (max) return `Up to €${roundToTens(max).toLocaleString()}`;
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

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 border-gray-200/80 bg-white/80 backdrop-blur-sm overflow-hidden"
      onClick={onClick}
    >
      {/* Gradient accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80 group-hover:opacity-100 transition-opacity" />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight truncate group-hover:text-blue-600 transition-colors">
              {job.job_title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 truncate">{job.company_name}</span>
              {job.company_industry && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500 truncate">{job.company_industry}</span>
                </>
              )}
            </div>
          </div>
          {showRoleIndustry && (
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-700 border-blue-200 text-xs flex-shrink-0"
            >
              {job.role_industry}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4 space-y-3">
        {/* Location & Work Mode */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          {job.working_mode && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <Badge
                variant="outline"
                className={`text-xs ${
                  job.working_mode.toLowerCase() === 'remote'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : job.working_mode.toLowerCase() === 'hybrid'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {formatWorkingMode(job.working_mode)}
              </Badge>
            </div>
          )}
        </div>

        {/* Skills/Tags */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.required_skills.slice(0, 4).map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="bg-gray-100 text-gray-700 border-0 text-xs font-normal"
              >
                {skill}
              </Badge>
            ))}
            {job.required_skills.length > 4 && (
              <Badge
                variant="secondary"
                className="bg-gray-100 text-gray-500 border-0 text-xs font-normal"
              >
                +{job.required_skills.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Salary */}
        {salaryInfo.salary && (
          <div className="flex items-center gap-2 pt-1">
            <CircleDollarSign className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800">{salaryInfo.salary}</span>
            {salaryInfo.isEstimate && (
              <Badge
                variant="outline"
                className="text-xs bg-violet-50 text-violet-600 border-violet-200"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Estimate
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
