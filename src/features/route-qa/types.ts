export type RouteQaItem = {
  id: string;
  route: string;
  test: string;
  expected: string;
};

export type RouteQaSection = {
  title: string;
  items: RouteQaItem[];
};

export type RouteQaStage = {
  title: string;
  sections: RouteQaSection[];
};

export type RouteQaChecklist = {
  updatedAt: string;
  stages: RouteQaStage[];
};

export type RouteQaFilter = "all" | "remaining" | "completed" | "noted";
