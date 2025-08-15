test('Ezan tipi değişiminde doğru action tetiklenmeli', () => {
  const { getByTestId } = render(<WidgetManager />);
  fireEvent.press(getByTestId('ezan-mevlid-button'));
  expect(mockedDispatch).toHaveBeenCalledWith(
    updateEzanSettings({ type: 'mevlid' })
  );
});

// Diğer test senaryoları...