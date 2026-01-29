'use client';

import { Job, displayMaps } from '@/types/job';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { ScrollArea } from '@repo/ui/components/scroll-area';
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  CircleDollarSign,
  ExternalLink,
  FileText,
  HeartHandshake,
  Languages,
  Layers,
  MapPin,
  ScrollText,
  Sparkles,
  Target,
  X,
} from 'lucide-react';

interface JobDetailViewProps {
  job: Job;
  onClose: () => void;
}

const formatWorkingMode = (mode?: string | null) => {
  if (!mode) return '';
  return displayMaps.working_mode[mode.toLowerCase()] || mode;
};

const formatEmploymentType = (type?: string | null) => {
  if (!type) return '';
  return displayMaps.employment_type[type.toLowerCase()] || type;
};

const formatContractType = (type?: string | null) => {
  if (!type) return '';
  return displayMaps.contract_type[type.toLowerCase()] || type;
};

const formatJobLevel = (level?: string | null) => {
  if (!level) return '';
  return displayMaps.job_level[level.toLowerCase()] || level;
};

const formatSalary = (min?: number | null, max?: number | null) => {
  if (!min && !max) return '';
  const roundToTens = (num: number) => Math.round(num / 10) * 10;
  if (min && max) {
    return `${roundToTens(min).toLocaleString()} - ${roundToTens(max).toLocaleString()} €/month`;
  }
  if (min) return `From ${roundToTens(min).toLocaleString()} €/month`;
  if (max) return `Up to ${roundToTens(max).toLocaleString()} €/month`;
  return '';
};

function JobSalary({ job }: { job: Job }) {
  const hasGuessedSalary = !!(
    job.guessed_salary ||
    job.guessed_salary_min ||
    job.guessed_salary_max
  );
  const hasActualSalary = !!(job.salary_min || job.salary_max);

  const salaryToShow = hasActualSalary
    ? formatSalary(job.salary_min, job.salary_max)
    : hasGuessedSalary
      ? formatSalary(job.guessed_salary_min || job.guessed_salary, job.guessed_salary_max)
      : '';

  if (!salaryToShow) return null;
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <CircleDollarSign className="h-4 w-4 shrink-0" />
      <span className="text-sm">
        {salaryToShow}
        {hasGuessedSalary && !hasActualSalary && (
          <Badge
            variant="outline"
            className="ml-2 text-xs bg-violet-50 text-violet-700 border-violet-200"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Estimate
          </Badge>
        )}
      </span>
    </div>
  );
}

export function JobDetailView({ job, onClose }: JobDetailViewProps) {
  const location = job.city
    ? `${job.city}, ${job.country}`
    : job.country || 'Location not specified';
  const showRoleIndustry = job.role_industry && job.role_industry !== job.company_industry;

  const handleApply = () => {
    const url = job.apply_link || job.source_url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="w-full flex flex-col h-[80dvh] md:h-[85vh] bg-white border-gray-200 shadow-2xl">
      <CardHeader className="pb-2 flex-none border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div className="space-y-3 flex-1">
            {/* Title and Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-xl font-bold text-gray-900">{job.job_title}</CardTitle>
              {showRoleIndustry && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  {job.role_industry}
                </Badge>
              )}
            </div>

            {/* Company, Industry, Location, Work Mode */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="text-sm">{job.company_name}</span>
              </div>
              {job.company_industry && (
                <>
                  <span className="text-gray-400 shrink-0">•</span>
                  <span className="text-sm text-gray-600">{job.company_industry}</span>
                </>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{location}</span>
              </div>
              {job.working_mode && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-sm">{formatWorkingMode(job.working_mode)}</span>
                </div>
              )}
            </div>

            {/* Employment Type, Contract, Level, Salary */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {job.employment_type && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />

                  <span>{formatEmploymentType(job.employment_type)}</span>
                </div>
              )}
              {job.contract_type && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{formatContractType(job.contract_type)}</span>
                </div>
              )}
              {job.job_level && (
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>{formatJobLevel(job.job_level)}</span>
                </div>
              )}
              <JobSalary job={job} />
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close job details"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 relative pb-0">
        <ScrollArea className="h-full">
          <div className="space-y-6 py-4">
            {/* Required Skills */}
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-500" />
                  <h3 className="font-semibold text-gray-900">Required Skills</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="bg-gray-50 text-gray-700 border-gray-200"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Required Languages */}
            {(job.language_summary ||
              (job.required_languages && job.required_languages.length > 0)) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-teal-600" />
                  <h3 className="font-semibold text-gray-900">Required Languages</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-gray-700 leading-relaxed">
                  {job.language_summary ? (
                    <span>{job.language_summary}</span>
                  ) : (
                    job.required_languages.map((language) => (
                      <Badge
                        key={language}
                        variant="secondary"
                        className="bg-gray-50 text-gray-700 border-gray-200"
                      >
                        {language}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Requirements</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm pl-4">
                  {job.requirements.map((requirement, index) => (
                    <li key={index}>{requirement}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Job Description */}
            {(job.job_description_summary || job.job_description) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-500" />
                  <h3 className="font-semibold text-gray-900">What you&apos;ll be doing</h3>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {job.job_description_summary || job.job_description}
                </div>
              </div>
            )}

            {/* Perks & Benefits */}
            {job.deprecated_perks && job.deprecated_perks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-500" />
                  <h3 className="font-semibold text-gray-900">Perks & Benefits</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm pl-4">
                  {job.deprecated_perks.map((perk, index) => (
                    <li key={index}>{perk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* About the Company */}
            {job.company_description && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">About the Company</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{job.company_description}</p>
              </div>
            )}

            {/* Company Culture */}
            {job.company_culture && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Company Culture</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{job.company_culture}</p>
              </div>
            )}

            {/* Company Values */}
            {job.company_values && job.company_values.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-500" />
                  <h3 className="font-semibold text-gray-900">Company Values</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm pl-4">
                  {job.company_values.map((value, index) => (
                    <li key={index}>{value}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source Link */}
            {(job.apply_link || job.source_url) && (
              <div className="pt-4 text-center pb-4">
                <button
                  onClick={() => {
                    const url = job.apply_link || job.source_url;
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <span>Show source</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Apply Button Footer */}
      {(job.apply_link || job.source_url) && (
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <Button
            onClick={handleApply}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Apply Now
          </Button>
        </div>
      )}
    </Card>
  );
}
