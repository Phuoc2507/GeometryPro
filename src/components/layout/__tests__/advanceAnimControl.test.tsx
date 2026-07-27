// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { AdvanceAnimControlView } from '../AdvanceAnimControl';

describe('AdvanceAnimControlView', () => {
  it('kéo thanh trượt gọi onSeek với t chuẩn hoá', () => {
    const onSeek = vi.fn();
    render(<AdvanceAnimControlView t={0} playing={false} label="Quét" onSeek={onSeek} onTogglePlay={() => {}} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.5' } });
    expect(onSeek).toHaveBeenCalledWith(0.5);
  });
});
