import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../shared/store/useAppStore";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
    document.documentElement.removeAttribute("data-theme");
  });

  it("mounts data-theme=dark on <html> by default (RNF-04)", () => {
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("updates data-theme when the store's theme changes", () => {
    render(<App />);

    act(() => {
      useAppStore.getState().setTheme("light");
    });

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("renders the app title", () => {
    render(<App />);

    expect(screen.getByText("Criterium Analytics")).toBeInTheDocument();
  });
});
