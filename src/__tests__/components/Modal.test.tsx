/**
 * Test 5: Modal component
 * Ověřuje otevření/zavření, Escape klávesa, backdrop click, footer.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../components/ui/Modal';

describe('Modal', () => {
  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        Obsah
      </Modal>
    );
    expect(screen.queryByText('Test')).toBeNull();
    expect(screen.queryByText('Obsah')).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Můj Modal">
        Obsah modálu
      </Modal>
    );
    expect(screen.getByText('Můj Modal')).toBeInTheDocument();
    expect(screen.getByText('Obsah modálu')).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        Obsah
      </Modal>
    );
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        Obsah
      </Modal>
    );
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        Obsah
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        Obsah
      </Modal>
    );
    // Backdrop is the div with bg-black/50
    const backdrop = container.querySelector('.bg-black\\/50');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render footer when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Test"
        footer={<button>Uložit</button>}
      >
        Obsah
      </Modal>
    );
    expect(screen.getByText('Uložit')).toBeInTheDocument();
  });

  it('should not render footer section when footer is not provided', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        Obsah
      </Modal>
    );
    // Only 1 border-t (the header), not 2
    const borderTElements = container.querySelectorAll('.border-t');
    expect(borderTElements.length).toBe(0);
  });

  it('should set body overflow to hidden when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        Obsah
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });
});
