import { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';
import { useLocaleContext } from '../../providers';
import { useTranslations } from 'next-intl';
import CurrencySelector from '@/app/components/CurrencySelector';
import { PREFERENCES, getPreference, setPreference } from '@/lib/preferences';
import { Card, Select } from '@/app/components/ui';

interface PreferencesCardProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  initialPreferences?: {
    defaultCurrency?: string;
    dateRange?: string;
    dateFormat?: string;
    ruleMode?: string;
  };
}

export default function PreferencesCard({ showToast, initialPreferences }: PreferencesCardProps) {
  const { locale, setLocale } = useLocaleContext();
  const t = useTranslations('settings');
  const tReports = useTranslations('reports');
  // WHY: Reusing the existing transactions.rulePrompt translations avoids duplicating
  // the three option labels (Ask/Always/Never) in the settings namespace.
  const tTxRulePrompt = useTranslations('transactions.rulePrompt');

  // WHY: Use server-side cookies (via initialPreferences props) as initial state to
  // eliminate the hydration disabled-flash. On mount, the useEffect re-reads via
  // getPreference to handle the localStorage migration edge case (cookie missing but
  // localStorage has a value).
  const [defaultCurrency, setDefaultCurrency] = useState<string>(
    initialPreferences?.defaultCurrency ?? PREFERENCES.defaultCurrency.default
  );
  const [defaultRange, setDefaultRange] = useState<string>(
    initialPreferences?.dateRange ?? PREFERENCES.dateRange.default
  );
  const [dateFormat, setDateFormat] = useState<string>(
    initialPreferences?.dateFormat ?? PREFERENCES.dateFormat.default
  );
  const [ruleMode, setRuleMode] = useState<string>(
    initialPreferences?.ruleMode ?? PREFERENCES.ruleMode.default
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // WHY: Using getPreference instead of raw localStorage.getItem ensures
    // the read follows the unified cookie-first hierarchy and handles
    // one-time migration for legacy localStorage-only values.
    setDefaultCurrency(getPreference(PREFERENCES.defaultCurrency));
    setDefaultRange(getPreference(PREFERENCES.dateRange));
    setDateFormat(getPreference(PREFERENCES.dateFormat));
    setRuleMode(getPreference(PREFERENCES.ruleMode));
    setMounted(true);
  }, []);

  // WHY: Using setPreference ensures dual-write to both localStorage and
  // cookie, with the cookie key defined in one place (PREFERENCES).
  const handleCurrencyChange = (curr: string) => {
    setDefaultCurrency(curr);
    setPreference(PREFERENCES.defaultCurrency, curr);
    showToast(t('currencySet', { currency: curr }));
  };

  const handleRangeChange = (range: string) => {
    setDefaultRange(range);
    setPreference(PREFERENCES.dateRange, range);
    showToast(t('periodSet', { period: range }));
  };

  const handleDateFormatChange = (fmt: string) => {
    setDateFormat(fmt);
    setPreference(PREFERENCES.dateFormat, fmt);
    showToast(t('dateFormatSet', { format: `${fmt} (${getFormatExample(fmt)})` }));
  };

  const handleRuleModeChange = (mode: string) => {
    setRuleMode(mode);
    setPreference(PREFERENCES.ruleMode, mode);
    // WHY: Build a human-readable label for the toast from the transactions.rulePrompt
    // namespace instead of duplicating mode labels in settings translations.
    const label = mode === 'ask' ? tTxRulePrompt('rulePromptAsk')
      : mode === 'always' ? tTxRulePrompt('rulePromptAlways')
      : tTxRulePrompt('rulePromptNever');
    showToast(t('ruleModeSet', { mode: label }));
  };

  const getFormatExample = (formatStr: string) => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    if (formatStr === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
    if (formatStr === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
    if (formatStr === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
    return '';
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title icon={<Sliders className="h-5 w-5" />}>
          {t('preferencesTitle')}
        </Card.Title>
        <p className="text-xs text-base-content/60 mb-4">
          {t('preferencesDesc')}
        </p>

        <div className="space-y-4">
          <div className="form-control w-full">
            <label className="label py-1" htmlFor="currency-select">
              <span className="label-text text-xs font-bold text-base-content/75">
                {t('currencyLabel')}
              </span>
            </label>
            <CurrencySelector
              id="currency-select"
              value={mounted ? defaultCurrency : PREFERENCES.defaultCurrency.default}
              onChange={handleCurrencyChange}
              className="w-full"
              placeholder={t('currencyLabel')}
            />
          </div>

          <Select
            id="range-select"
            label={t('dateRangeLabel')}
            value={mounted ? defaultRange : 'Month'}
            onChange={(e) => handleRangeChange(e.target.value)}
            size="sm"
          >
            <option value="Month">{tReports('datePresets.month')}</option>
            <option value="3m">{tReports('datePresets.threeMonths')}</option>
            <option value="6m">{tReports('datePresets.sixMonths')}</option>
            <option value="ytd">{tReports('datePresets.ytd')}</option>
            <option value="12m">{tReports('datePresets.twelveMonths')}</option>
          </Select>

          <Select
            id="date-format-select"
            label={t('dateFormatLabel')}
            value={mounted ? dateFormat : 'YYYY-MM-DD'}
            onChange={(e) => handleDateFormatChange(e.target.value)}
            size="sm"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD ({getFormatExample('YYYY-MM-DD')})</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY ({getFormatExample('DD/MM/YYYY')})</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY ({getFormatExample('MM/DD/YYYY')})</option>
          </Select>

          <Select
            id="rule-mode-select"
            label={t('ruleModeLabel')}
            value={mounted ? ruleMode : PREFERENCES.ruleMode.default}
            onChange={(e) => handleRuleModeChange(e.target.value)}
            size="sm"
          >
            <option value="ask">{tTxRulePrompt('rulePromptAsk')}</option>
            <option value="always">{tTxRulePrompt('rulePromptAlways')}</option>
            <option value="never">{tTxRulePrompt('rulePromptNever')}</option>
          </Select>

          <Select
            id="language-select"
            label={t('languageLabel')}
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
            size="sm"
            aria-label={t('languageToggleAriaLabel')}
          >
            <option value="en">{t('languages.en')}</option>
            <option value="zh">{t('languages.zh')}</option>
          </Select>
        </div>
      </Card.Body>
    </Card>
  );
}
