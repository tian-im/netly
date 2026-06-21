'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, X } from 'lucide-react';
import { Button, Input, Card, Autocomplete } from '@/app/components/ui';
import type { Category } from '../types';

interface RulesPanelProps {
  categories: Category[];
  isCreatingRule: boolean;
  deletingRuleId: string | null;
  onCreateRule: (pattern: string, categoryId: string) => Promise<void>;
  onDeleteRuleClick: (ruleId: string, catId: string, pattern: string) => void;
  createdCategoryId?: string | null;
  onSelectCreatedCategory?: () => void;
}

export default function RulesPanel({
  categories,
  isCreatingRule,
  deletingRuleId,
  onCreateRule,
  onDeleteRuleClick,
  createdCategoryId,
  onSelectCreatedCategory,
}: RulesPanelProps) {
  const t = useTranslations('categories');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleCatId, setNewRuleCatId] = useState(() => categories[0]?.id ?? '');

  // Auto-select first category when current selection becomes invalid
  useEffect(() => {
    if (!newRuleCatId || !categories.find((c) => c.id === newRuleCatId)) {
      setNewRuleCatId(categories[0]?.id ?? '');
    }
  }, [categories, newRuleCatId]);

  // Auto-select a newly created category in the rule form
  useEffect(() => {
    if (createdCategoryId && categories.find((c) => c.id === createdCategoryId)) {
      setNewRuleCatId(createdCategoryId);
      onSelectCreatedCategory?.();
    }
  }, [createdCategoryId, categories, onSelectCreatedCategory]);

  const totalRules = categories.reduce((acc, c) => acc + (c.rules?.length ?? 0), 0);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRulePattern.trim() || !newRuleCatId) return;
    await onCreateRule(newRulePattern.trim(), newRuleCatId);
    setNewRulePattern('');
  };

  const hasAnyRules = categories.some((cat) => cat.rules && cat.rules.length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: Rules List grouped by category */}
      <div className="lg:col-span-2 space-y-4">
        {!hasAnyRules ? (
          <Card shadow="sm">
            <Card.Body className="items-center text-center py-16">
              <Settings className="h-12 w-12 mb-4 text-base-content/30" />
              <h3 className="text-lg font-bold text-base-content/60">{t('noMatchRulesYet')}</h3>
              <p className="text-sm text-base-content/40 max-w-xs">{t('matchRulesInstructions')}</p>
            </Card.Body>
          </Card>
        ) : (
          categories.map((cat) => {
            if (!cat.rules || cat.rules.length === 0) return null;
            return (
              <Card key={cat.id} shadow="sm">
                <Card.Body className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-base">{cat.name}</h3>
                    <span
                      className={`badge badge-sm font-semibold text-white ${
                        cat.type === 'INCOME'
                          ? 'badge-success'
                          : cat.type === 'EXPENSE'
                          ? 'badge-error'
                          : 'badge-warning'
                      }`}
                    >
                      {cat.type === 'INCOME'
                        ? t('typeIncome')
                        : cat.type === 'EXPENSE'
                        ? t('typeExpense')
                        : t('typeTransfer')}
                    </span>
                    <span className="badge badge-ghost badge-sm ml-auto">
                      {t('rulesCount', { count: cat.rules.length })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {cat.rules.map((rule) => {
                      const isDeletingRule = deletingRuleId === rule.id;
                      return (
                        <div
                          key={rule.id}
                          className="flex justify-between items-center bg-base-200 px-3 py-2 rounded-lg text-sm"
                        >
                          <span className="font-mono font-semibold text-primary">&quot;{rule.pattern}&quot;</span>
                          <Button
                            onClick={() => onDeleteRuleClick(rule.id, cat.id, rule.pattern)}
                            variant="ghost"
                            size="xs"
                            className="btn-circle text-error hover:bg-error/10 flex items-center justify-center p-0"
                            disabled={deletingRuleId !== null}
                            title={t('delete')}
                            aria-label={t('ruleDeleteWarning', { pattern: rule.pattern })}
                            icon={isDeletingRule ? undefined : <X className="h-3.5 w-3.5" />}
                            loading={isDeletingRule}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            );
          })
        )}
      </div>

      {/* Right column: Create Rule Form + Summary */}
      <div>
        <Card>
          <Card.Body className="p-6">
            <Card.Title icon={<Settings className="h-4 w-4" />} className="text-md uppercase tracking-wider">
              {t('createRule')}
            </Card.Title>
            <p className="text-xs text-base-content/60">{t('matchRulesInstructions')}</p>

            <form onSubmit={handleCreateRule} className="space-y-4 mt-4">
              <Input
                id="new-rule-pattern"
                label={t('merchantKeyword')}
                type="text"
                placeholder={t('merchantKeywordPlaceholder')}
                value={newRulePattern}
                onChange={(e) => setNewRulePattern(e.target.value)}
                className="input-sm"
                required
                disabled={isCreatingRule || categories.length === 0}
                helperText={t('regexHint')}
              />

              <Autocomplete
                id="new-rule-category"
                label={t('assignCategory')}
                value={newRuleCatId}
                onChange={(val) => setNewRuleCatId(val)}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                size="sm"
                required
                disabled={isCreatingRule || categories.length === 0}
                placeholder={t('searchPlaceholder')}
                noMatchesText={t('noCategoriesFound')}
              />

              <Button
                type="submit"
                size="sm"
                className="w-full mt-2"
                disabled={!newRulePattern.trim() || categories.length === 0}
                loading={isCreatingRule}
              >
                {t('createRule')}
              </Button>
            </form>
          </Card.Body>
        </Card>

        {/* Summary stats */}
        <Card shadow="sm" className="mt-4">
          <Card.Body className="p-4">
            <h3 className="font-bold text-sm text-base-content/60 uppercase tracking-wider mb-3">
              {t('summary')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/70">{t('totalRules')}</span>
                <span className="font-mono font-bold">{totalRules}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">{t('categoriesWithRules')}</span>
                <span className="font-mono font-bold">
                  {categories.filter((c) => c.rules && c.rules.length > 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">{t('categoriesWithoutRules')}</span>
                <span className="font-mono font-bold text-warning">
                  {categories.filter((c) => !c.rules || c.rules.length === 0).length}
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
