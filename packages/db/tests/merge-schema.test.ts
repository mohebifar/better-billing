import { describe, it, expect } from "vitest";
import { z } from "zod";
import { mergeSchema } from "~/utils/merge-schema";

describe("mergeSchema", () => {
  describe("basic merging", () => {
    it("should merge two schemas with different tables", () => {
      const schema1 = {
        users: z.object({
          id: z.string(),
          name: z.string(),
        }),
      };

      const schema2 = {
        posts: z.object({
          id: z.string(),
          title: z.string(),
          authorId: z.string(),
        }),
      };

      const merged = mergeSchema(schema1, schema2);

      expect(merged.users).toBeDefined();
      expect(merged.posts).toBeDefined();

      const user = merged.users.parse({
        id: "123",
        name: "John Doe",
      });
      expect(user).toEqual({ id: "123", name: "John Doe" });

      const post = merged.posts.parse({
        id: "456",
        title: "Hello World",
        authorId: "123",
      });
      expect(post).toEqual({
        id: "456",
        title: "Hello World",
        authorId: "123",
      });
    });

    it("should merge single schema", () => {
      const schema = {
        users: z.object({
          id: z.string(),
          name: z.string(),
        }),
      };

      const merged = mergeSchema(schema);

      expect(merged.users).toBeDefined();
      const user = merged.users.parse({
        id: "123",
        name: "John Doe",
      });
      expect(user).toEqual({ id: "123", name: "John Doe" });
    });
  });

  describe("extending schemas", () => {
    it("should extend schemas with overlapping table names", () => {
      const schema1 = {
        users: z.object({
          id: z.string(),
          name: z.string(),
        }),
      };

      const schema2 = {
        users: z.object({
          email: z.string().email(),
          createdAt: z.date(),
        }),
      };

      const merged = mergeSchema(schema1, schema2);

      const user = merged.users.parse({
        id: "123",
        name: "John Doe",
        email: "john@example.com",
        createdAt: new Date(),
      });

      expect(user.id).toBe("123");
      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john@example.com");
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("should extend schemas multiple times", () => {
      const schema1 = {
        users: z.object({
          id: z.string(),
        }),
      };

      const schema2 = {
        users: z.object({
          name: z.string(),
        }),
      };

      const schema3 = {
        users: z.object({
          email: z.string().email(),
        }),
      };

      const merged = mergeSchema(schema1, schema2, schema3);

      const user = merged.users.parse({
        id: "123",
        name: "John Doe",
        email: "john@example.com",
      });

      expect(user).toEqual({
        id: "123",
        name: "John Doe",
        email: "john@example.com",
      });
    });
  });

  describe("multiple schema merging", () => {
    it("should merge three schemas with different and overlapping tables", () => {
      const schema1 = {
        users: z.object({
          id: z.string(),
          name: z.string(),
        }),
        posts: z.object({
          id: z.string(),
          title: z.string(),
        }),
      };

      const schema2 = {
        users: z.object({
          email: z.string().email(),
        }),
        comments: z.object({
          id: z.string(),
          content: z.string(),
          postId: z.string(),
        }),
      };

      const schema3 = {
        posts: z.object({
          authorId: z.string(),
          createdAt: z.date(),
        }),
        tags: z.object({
          id: z.string(),
          name: z.string(),
        }),
      };

      const merged = mergeSchema(schema1, schema2, schema3);

      const user = merged.users.parse({
        id: "123",
        name: "John Doe",
        email: "john@example.com",
      });
      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john@example.com");

      const post = merged.posts.parse({
        id: "456",
        title: "Hello World",
        authorId: "123",
        createdAt: new Date(),
      });
      expect(post.title).toBe("Hello World");
      expect(post.authorId).toBe("123");

      const comment = merged.comments.parse({
        id: "789",
        content: "Great post!",
        postId: "456",
      });
      expect(comment.content).toBe("Great post!");

      const tag = merged.tags.parse({
        id: "101",
        name: "typescript",
      });
      expect(tag.name).toBe("typescript");
    });
  });

  describe("error handling", () => {
    it("should fail validation when required fields are missing", () => {
      const schema1 = {
        users: z.object({
          id: z.string(),
          name: z.string(),
        }),
      };

      const schema2 = {
        users: z.object({
          email: z.string().email(),
        }),
      };

      const merged = mergeSchema(schema1, schema2);

      expect(() => {
        merged.users.parse({
          id: "123",
          name: "John Doe",
        });
      }).toThrow();

      // Should fail when missing original field
      expect(() => {
        merged.users.parse({
          id: "123",
          email: "john@example.com",
          // missing name
        });
      }).toThrow();
    });

    it("should validate field types correctly in extended schemas", () => {
      const schema1 = {
        users: z.object({
          id: z.string(),
        }),
      };

      const schema2 = {
        users: z.object({
          age: z.number(),
          email: z.string().email(),
        }),
      };

      const merged = mergeSchema(schema1, schema2);

      expect(() => {
        merged.users.parse({
          id: "123",
          age: 30,
          email: "invalid-email",
        });
      }).toThrow();

      expect(() => {
        merged.users.parse({
          id: "123",
          age: "thirty",
          email: "john@example.com",
        });
      }).toThrow();
    });
  });

  describe("complex field types", () => {
    it("should handle complex zod types", () => {
      const schema1 = {
        users: z.object({
          id: z.string().uuid(),
          metadata: z.record(z.string(), z.any()),
        }),
      };

      const schema2 = {
        users: z.object({
          preferences: z.object({
            theme: z.enum(["light", "dark"]),
            notifications: z.boolean(),
          }),
          tags: z.array(z.string()),
        }),
      };

      const merged = mergeSchema(schema1, schema2);

      const user = merged.users.parse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        metadata: { role: "admin", department: "engineering" },
        preferences: {
          theme: "dark",
          notifications: true,
        },
        tags: ["typescript", "react", "node"],
      });

      expect(user.preferences.theme).toBe("dark");
      expect(user.tags).toHaveLength(3);
      expect(user.metadata.role).toBe("admin");
    });
  });
});
