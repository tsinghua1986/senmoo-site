import { forwardRef } from 'react';
import { useDecision } from '../store/DecisionContext';

/**
 * PosterExport - A pure RGB-color component for html2canvas export.
 * Avoids Tailwind v4 oklch colors and SVG animations that html2canvas can't render.
 * All colors are explicit hex/rgb values.
 */
const PosterExport = forwardRef<HTMLDivElement>(function PosterExport(_, ref) {
  const { state } = useDecision();
  const { actionPlan } = state;

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
        background: '#FAF9F6',
        fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
        padding: '0',
        margin: '0',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          background: 'linear-gradient(90deg, #C67C5B 0%, #D4A574 100%)',
          padding: '32px 40px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '8px' }}>
          决策透镜 | Decision Lens
        </div>
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>你的专属决策诊断单</div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 40px' }}>
        {/* Real Issue */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#C67C5B', marginBottom: '10px', letterSpacing: '1px' }}>
            你的真实问题
          </div>
          <div style={{ fontSize: '22px', color: '#1A1A2E', lineHeight: '1.7' }}>
            {state.realIssue}
          </div>
        </div>

        {/* Recommendation */}
        <div
          style={{
            background: '#F0FDFA',
            border: '1px solid #99F6E4',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '28px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#C67C5B', marginBottom: '10px', letterSpacing: '1px' }}>
            建议方向
          </div>
          <div style={{ fontSize: '18px', color: '#1A1A2E', lineHeight: '1.7' }}>
            {actionPlan.recommendation}
          </div>
        </div>

        {/* Analysis */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', marginBottom: '10px', letterSpacing: '1px' }}>
            深度分析
          </div>
          <div style={{ fontSize: '17px', color: '#374151', lineHeight: '1.7' }}>
            {actionPlan.analysisText}
          </div>
        </div>

        {/* Test Action */}
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '28px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#D97706', marginBottom: '10px', letterSpacing: '1px' }}>
            最小破冰实验
          </div>
          <div style={{ fontSize: '18px', color: '#1A1A2E', lineHeight: '1.7', fontWeight: 500 }}>
            {actionPlan.testAction}
          </div>
        </div>

        {/* Verification Rule */}
        {actionPlan.verificationRule && (() => {
          const vr = actionPlan.verificationRule;
          return (
            <div
              style={{
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: '12px',
                padding: '20px 24px',
                marginBottom: '28px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#4338CA', marginBottom: '14px', letterSpacing: '1px' }}>
                验证规则 · 如何判断实验结果
              </div>
              <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.8' }}>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#818CF8', marginRight: '6px' }}></span>
                  <span style={{ color: '#6B7280', fontSize: '13px' }}>指标：</span>
                  {vr.metric}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#818CF8', marginRight: '6px' }}>🎯</span>
                  <span style={{ color: '#6B7280', fontSize: '13px' }}>阈值：</span>
                  {vr.threshold}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: '#818CF8', marginRight: '6px' }}>⏱️</span>
                  <span style={{ color: '#6B7280', fontSize: '13px' }}>时间窗口：</span>
                  {vr.timeframe}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #C7D2FE',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(15,118,110,0.06)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#C67C5B', marginBottom: '4px' }}>
                      ✅ 若达到
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                      {vr.successAction}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(220,38,38,0.06)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#DC2626', marginBottom: '4px' }}>
                      ❌ 若未达到
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                      {vr.failureAction}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Key Ambiguity */}
        {actionPlan.keyAmbiguity && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#9CA3AF', marginBottom: '8px', letterSpacing: '1px' }}>
              剩余不确定性
            </div>
            <div style={{ fontSize: '15px', color: '#9CA3AF', fontStyle: 'italic', lineHeight: '1.6' }}>
              {actionPlan.keyAmbiguity}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #E5E7EB',
            fontSize: '13px',
            color: '#D1D5DB',
          }}
        >
          AI生成内容仅作为参考使用，请谨慎决策 · 由Senmoo「决策透镜」生成 · {new Date(state.updatedAt).toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  );
});

export default PosterExport;
